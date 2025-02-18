import axios from 'axios'
import { execSync, spawn } from 'child_process'
import { writeFile } from 'fs/promises'
import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiError } from 'src/error'

const axiosInstance = (adminUsername, adminPassword, domainSuffix) =>
  axios.create({
    baseURL: `https://gitea.${domainSuffix}/api/v1`,
    auth: {
      username: adminUsername,
      password: adminPassword,
    },
  })

export async function getGiteaRepoUrls(adminUsername, adminPassword, orgName, domainSuffix) {
  try {
    const repoNames = new Set<string>()
    const orgResponse = await axiosInstance(adminUsername, adminPassword, domainSuffix).get(`/orgs/${orgName}/repos`)
    orgResponse.data.forEach((repo) => repoNames.add(repo.full_name as string))

    // retrieve and add repository names for gitea users
    // const users = await axiosInstance(adminUsername, adminPassword, domainSuffix).get('/admin/users')
    // const usernames = users.data.map((user) => user.username)
    // for (const username of usernames) {
    //   const response = await axiosInstance(adminUsername, adminPassword, domainSuffix).get(`/users/${username}/repos`)
    //   response.data.forEach((repo) => repoNames.add(repo.full_name as string))
    // }

    // filter out values, charts and team-<teamId>-argocd repositories
    const regex = new RegExp(`^${orgName}\\/team-[\\w-]+-argocd$`)
    const filteredRepoNames = Array.from(repoNames).filter(
      (item: string) => item !== `${orgName}/values` && item !== `${orgName}/charts` && !regex.test(item),
    )
    const giteaRepoUrls = filteredRepoNames.map((name: string) => `https://gitea.${domainSuffix}/${name}.git`)
    return giteaRepoUrls
  } catch (err) {
    const error = new OtomiError('Error getting internal repository names')
    error.code = 500
    error.publicMessage = 'Error getting internal repository names'
    throw error
  }
}

function normalizeSSHKey(sshPrivateKey) {
  if (
    !sshPrivateKey.includes('-----BEGIN OPENSSH PRIVATE KEY-----') ||
    !sshPrivateKey.includes('-----END OPENSSH PRIVATE KEY-----')
  )
    throw new Error('Invalid SSH Key format')

  const basePrivateKey = sshPrivateKey
    .replace(/-----BEGIN OPENSSH PRIVATE KEY-----/g, '')
    .replace(/-----END OPENSSH PRIVATE KEY-----/g, '')
    .trim()
    .replace(/\s+/g, '\n')

  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${basePrivateKey}\n-----END OPENSSH PRIVATE KEY-----`
}

async function connectPrivateRepo(
  repoUrl: string,
  sshKey?: string,
  username?: string,
  accessToken?: string,
): Promise<{ status: string }> {
  const keyPath = '/tmp/otomi/sshKey'
  try {
    let git: SimpleGit
    let url = repoUrl

    if (url.startsWith('git@') && sshKey) {
      await writeFile(keyPath, `${sshKey}\n`, { mode: 0o600 })
      // Start SSH agent
      const sshAgentOutput = execSync('ssh-agent -s').toString()
      const agentSocketMatch = sshAgentOutput.match(/SSH_AUTH_SOCK=([^;]+)/)
      const agentPidMatch = sshAgentOutput.match(/SSH_AGENT_PID=([0-9]+)/)
      if (!agentSocketMatch || !agentPidMatch) throw new Error('Failed to start SSH agent')
      process.env.SSH_AUTH_SOCK = agentSocketMatch[1]
      process.env.SSH_AGENT_PID = agentPidMatch[1]
      if (!sshKey) throw new Error('SSH key is required for SSH authentication')

      // Add SSH private key
      const sshAdd = spawn('ssh-add', ['-'], { stdio: ['pipe', 'inherit', 'inherit'] })
      sshAdd.stdin.write(`${sshKey}\n`)
      sshAdd.stdin.end()
      await new Promise((resolve, reject) => {
        sshAdd.on('close', (code) => (code === 0 ? resolve(undefined) : reject(new Error('Failed to add SSH key'))))
      })

      process.env.GIT_SSH_COMMAND = 'ssh -o User=node StrictHostKeyChecking=no'

      git = simpleGit()
    } else if (url.startsWith('https://')) {
      if (!username || !accessToken) throw new Error('Username and access token are required for HTTPS authentication')
      const urlWithAuth = repoUrl.replace(
        'https://',
        `https://${encodeURIComponent(username)}:${encodeURIComponent(accessToken)}@`,
      )

      git = simpleGit()
      url = urlWithAuth
    } else throw new Error('Invalid repository URL format. Must be SSH or HTTPS.')

    await git.listRemote([url])
    return { status: 'success' }
  } catch (error) {
    console.log('error', error)
    return { status: 'failed' }
  } finally {
    if (process.env.SSH_AGENT_PID && repoUrl.startsWith('git@')) execSync(`kill ${process.env.SSH_AGENT_PID}`)
  }
}

export async function testPrivateRepoConnect(
  repoUrl: string,
  sshPrivateKey?: string,
  username?: string,
  accessToken?: string,
) {
  await new Promise((r) => setTimeout(r, 10))
  const normalizedKey: string = sshPrivateKey ? normalizeSSHKey(sshPrivateKey) : ''
  return connectPrivateRepo(repoUrl, normalizedKey, username, accessToken)
}
