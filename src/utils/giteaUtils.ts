import axios from 'axios'
import { Build } from 'src/otomi-models'
import { cleanEnv, GIT_PASSWORD, GIT_REPO_URL, GIT_USER } from '../validators'

interface GiteaWebHook {
  id: number
  type: string
  config: {
    content_type: string
    url: string
  }
  events: string[]
  authorization_header: string
  active: boolean
  updated_at: string
  created_at: string
}

const env = cleanEnv({
  GIT_PASSWORD,
  GIT_REPO_URL,
  GIT_USER,
})

function webhookData(
  teamId: string,
  data: Build,
): {
  authHeader: string
  repoUrl: string
  repoName: string
  giteaUrl: string
  serviceUrl: string
} {
  const authHeader = `Basic ${Buffer.from(`${env.GIT_USER}:${env.GIT_PASSWORD}`).toString('base64')}`
  const { type } = data.mode!
  const repoUrl: string = data.mode![type] ? data.mode!['docker'].repoUrl : data.mode!['buildpacks'].repoUrl
  let repoName: string = repoUrl.split('/').pop()!
  if (repoName.includes('.')) repoName = repoName.split('.').shift()!
  let gitUrl = env.GIT_REPO_URL
  if (!gitUrl.includes('http')) gitUrl = gitUrl.startsWith('http') ? gitUrl : `https://${gitUrl}`
  const parsedUrl = new URL(gitUrl)
  const serviceUrl = `http://el-gitea-webhook-${data.name}.${teamId}.svc.cluster.local:8080`

  return { authHeader, repoUrl, repoName, giteaUrl: parsedUrl.hostname, serviceUrl }
}

export function webhookConfig(serviceUrl: string): {
  type: string
  active: boolean
  events: string[]
  config: { content_type: string; url: string }
} {
  return {
    type: 'gitea',
    active: true,
    events: ['push'],
    config: {
      content_type: 'json',
      url: serviceUrl,
    },
  }
}

export async function createGiteaWebhook(teamId: string, data: Build): Promise<GiteaWebHook | { id: undefined }> {
  try {
    const hookSetup = webhookData(teamId, data)
    const url = `https://${hookSetup.giteaUrl}/api/v1/repos/team-${teamId}/${hookSetup.repoName}/hooks`
    console.log(`Creating webhook for Build '${data.name}' in 'team-${teamId}/${hookSetup.repoName}'`)
    const response = await axios.post(url, webhookConfig(hookSetup.serviceUrl), {
      headers: {
        Authorization: hookSetup.authHeader,
        'Content-Type': 'application/json',
      },
    })
    return response.data
  } catch (error) {
    console.error(`Error creating webhook`)
    return { id: undefined }
  }
}

export async function updateGiteaWebhook(
  webhookId: number,
  teamId: string,
  data: Build,
): Promise<GiteaWebHook | { id: undefined }> {
  try {
    const hookSetup = webhookData(teamId, data)
    const url = `https://${hookSetup.giteaUrl}/api/v1/repos/team-${teamId}/${hookSetup.repoName}/hooks/${webhookId}`
    console.log(`Updating webhook for Build '${data.name}' in 'team-${teamId}/${hookSetup.repoName}'`)
    const response = await axios.patch(url, webhookConfig(hookSetup.serviceUrl), {
      headers: {
        Authorization: hookSetup.authHeader,
        'Content-Type': 'application/json',
      },
    })
    return response.data
  } catch (error) {
    if (error.response.status === 404) {
      console.error(`Webhook for Build '${data.name}' could not be found in team-${teamId}`)
      return await createGiteaWebhook(teamId, data)
    } else {
      console.error(`Error updating webhook '${data.name}' in team-${teamId}`)
      return { id: undefined }
    }
  }
}

export async function deleteGiteaWebhook(webhookId: number, teamId: string, data: Build): Promise<any> {
  try {
    const hookSetup = webhookData(teamId, data)
    const url = `https://${hookSetup.giteaUrl}/api/v1/repos/team-${teamId}/${hookSetup.repoName}/hooks/${webhookId}`
    console.log(`Deleting webhook for Build '${data.name}' in 'team-${teamId}/${hookSetup.repoName}'`)
    const response = await axios.delete(url, {
      headers: {
        Authorization: hookSetup.authHeader,
        'Content-Type': 'application/json',
      },
    })
    return response
  } catch (error) {
    if (error.response.status === 404)
      console.error(`Webhook for Build '${data.name}' could not be found in team-${teamId}`)
    else console.error(`Error removing webhook '${data.name}' in team-${teamId}`)
  }
}
