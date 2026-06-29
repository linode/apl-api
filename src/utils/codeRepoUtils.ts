/* eslint-disable prefer-destructuring */
import axios from 'axios'
import { writeFile } from 'fs/promises'
import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiError } from 'src/error'
import { v4 as uuidv4 } from 'uuid'
import { getAuthenticatedUrl } from '../git/connect'
import { getSecretValues } from '../k8s-operations'
import { APL_SECRETS_NAMESPACE, GITEA_SECRETS_NAME } from '../constants'

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

const SAFE_HOST_REGEX = /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const SAFE_REPO_PATH_REGEX = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/

export function normalizeRepoUrl(inputUrl: string, isPrivate: boolean, isSSH: boolean): string | null {
  try {
    const cleanUrl = inputUrl.trim().replace(/\/$/, '')

    let hostname: string
    let repoPath: string

    if (cleanUrl.startsWith('git@')) {
      const match = cleanUrl
        .replace(/\.git$/, '')
        .match(/^git@([A-Za-z0-9.-]+\.[A-Za-z]{2,}):([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+)$/)

      if (!match) return null

      hostname = match[1]
      repoPath = match[2]
    } else {
      const urlToParse = /^[a-z][a-z0-9+.-]*:/i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`

      const parsed = new URL(urlToParse)

      if (parsed.protocol !== 'https:') return null
      if (!SAFE_HOST_REGEX.test(parsed.hostname)) return null

      repoPath = parsed.pathname.replace(/\.git$/, '').replace(/^\/|\/$/g, '')

      if (!SAFE_REPO_PATH_REGEX.test(repoPath)) return null

      hostname = parsed.hostname
    }

    const repoWithGitSuffix = `${repoPath}.git`

    if (isPrivate && isSSH) {
      return `git@${hostname}:${repoWithGitSuffix}`
    }

    return `https://${hostname}/${repoWithGitSuffix}`
  } catch {
    return null
  }
}

export function normalizeSSHKey(sshPrivateKey) {
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

export function getInternalGiteaUrl(domainSuffix: string | undefined): string {
  if (!domainSuffix) return ''
  return `https://gitea.${domainSuffix}`
}

export async function getGiteaAuth(appValues: Record<string, any>): Promise<
  | {
      username: string
      password: string
    }
  | undefined
> {
  if (!appValues?.enabled) {
    return undefined
  }
  const giteaSecrets = await getSecretValues(GITEA_SECRETS_NAME, APL_SECRETS_NAMESPACE)
  if (!giteaSecrets?.adminPassword) {
    return undefined
  }
  return {
    username: (appValues?.adminUsername as string) || 'otomi-admin',
    password: giteaSecrets?.adminPassword,
  }
}

export async function getAuthenticatedGitClient(
  repoUrl: string,
  teamId: string,
  domainSuffix?: string,
  giteaAppValues?: Record<string, any>,
  secretName?: string,
): Promise<{ git: SimpleGit; url: string; keyPath?: string }> {
  const git: SimpleGit = simpleGit().env('GIT_TERMINAL_PROMPT', '0')

  const isPrivate = !!secretName
  const isSSH = repoUrl.startsWith('git@')
  const isHTTPS = repoUrl.startsWith('https://')
  if (!isSSH && !isHTTPS) {
    throw new Error('Invalid repository URL format. Must be SSH or HTTPS.')
  }
  const normalizedUrl = normalizeRepoUrl(repoUrl, isPrivate, isSSH)
  const giteaInternalUrl = getInternalGiteaUrl(domainSuffix)

  if (!normalizedUrl) {
    throw new Error('Invalid URL provided')
  }
  if (isSSH && !secretName) {
    throw new Error('SSH requires a secret with private key')
  }

  if (secretName) {
    // Prefer to use provided credentials, even if internal Git repo is used
    const secret = await getSecretValues(secretName, `team-${teamId}`)
    if (!secret) {
      throw new Error(`Secret ${secretName} not found in namespace team-${teamId}`)
    }
    if (isSSH) {
      const sshKey = secret?.['ssh-privatekey']
      if (!sshKey) {
        throw new Error(`No value found for "ssh-privatekey" in secret ${secretName}`)
      }
      const normalizedKey = normalizeSSHKey(sshKey)
      if (normalizedKey) {
        const keyId = uuidv4()
        const keyPath = `/tmp/otomi/sshKey-${keyId}`
        await writeFile(keyPath, `${normalizedKey}\n`, { mode: 0o600, flag: 'wx' })
        const GIT_SSH_COMMAND = `ssh -i ${keyPath} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`
        git.env('GIT_SSH_COMMAND', GIT_SSH_COMMAND)
        return { git, url: normalizedUrl, keyPath }
      } else {
        throw new Error(
          `Value found in "ssh-privatekey" in secret ${secretName} found, but invalid or not a private key`,
        )
      }
    } else {
      if (!secret?.password) {
        throw new Error(
          `Access token (or password) is required for HTTPS authentication in value "password" in secret ${secretName}`,
        )
      }
      const authUrl = getAuthenticatedUrl({
        repoUrl: normalizedUrl,
        username: secret.username,
        password: secret.password,
      })
      return { git, url: authUrl }
    }
  } else if (giteaInternalUrl && giteaAppValues && normalizedUrl === giteaInternalUrl) {
    // For internal Gitea, use internal credentials if nothing else was provided
    const giteaAuth = await getGiteaAuth(giteaAppValues)
    if (!giteaAuth) {
      throw new Error('Internal Gitea URL provided, but app not configured or no credentials found')
    }
    const authUrl = getAuthenticatedUrl({ repoUrl: normalizedUrl, ...giteaAuth })
    return { git, url: authUrl }
  } else {
    // Default to unauthenticated HTTPS
    return { git, url: normalizedUrl }
  }
}

export async function extractRepositoryRefs(url: string, git: SimpleGit): Promise<string[]> {
  const rawData = await git.listRemote(['--refs', url])
  const branches: string[] = []
  const tags: string[] = []

  rawData.split('\n').forEach((line) => {
    const parts = line.split('\t')
    if (parts.length !== 2) return
    const ref = parts[1]
    if (ref.startsWith('refs/heads/')) branches.push(ref.replace('refs/heads/', ''))
    else if (ref.startsWith('refs/tags/')) tags.push(ref.replace('refs/tags/', ''))
  })

  return [...branches, ...tags]
}
