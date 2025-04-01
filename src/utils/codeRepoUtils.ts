/* eslint-disable prefer-destructuring */
import axios from 'axios'
import { pathExists, unlink } from 'fs-extra'
import { chmod, writeFile } from 'fs/promises'
import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiError } from 'src/error'
import { v4 as uuidv4 } from 'uuid'

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

export function normalizeRepoUrl(inputUrl: string, isPrivate: boolean, isSSH: boolean): string | null {
  try {
    let parsedUrl: URL
    let owner: string
    let repoName: string

    const cleanUrl = inputUrl
      .trim()
      .replace(/\.git$/, '')
      .replace(/\/$/, '')
    const initMatch = cleanUrl.match(
      /^(https?:\/\/(github\.com|gitlab\.com)\/([^/]+)\/([^/]+)|git@(github\.com|gitlab\.com):([^/]+)\/([^/]+))/,
    )

    if (!initMatch) throw new Error('Invalid repository URL.')

    if (inputUrl.startsWith('git@')) {
      const match = inputUrl.match(/^git@([^:]+):([^/]+)\/(.+?)(\.git)?$/)
      if (!match) throw new Error('Invalid SSH repository URL.')
      const [, hostname, extractedOwner, extractedRepo] = match
      owner = extractedOwner
      repoName = extractedRepo.endsWith('.git') ? extractedRepo : `${extractedRepo}.git`
      parsedUrl = new URL(`https://${hostname}/${owner}/${repoName}`)
    } else {
      parsedUrl = new URL(inputUrl)
      const segments = parsedUrl.pathname.split('/').filter(Boolean)
      if (segments.length < 2) throw new Error('Invalid repository URL: not enough segments.')
      owner = segments[0]
      repoName = segments[1].endsWith('.git') ? segments[1] : `${segments[1]}.git`
    }
    if (isPrivate && isSSH) return `git@${parsedUrl.hostname}:${owner}/${repoName}`
    else return `https://${parsedUrl.hostname}/${owner}/${repoName}`
  } catch (error) {
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

export async function setupGitAuthentication(
  repoUrl: string,
  sshPrivateKey?: string,
  username?: string,
  accessToken?: string,
): Promise<{ git: SimpleGit; url: string; keyPath?: string }> {
  let keyPath: string | undefined
  const git: SimpleGit = simpleGit()
  let url = repoUrl

  if (url.startsWith('git@')) {
    const normalizedKey: string = sshPrivateKey ? normalizeSSHKey(sshPrivateKey) : ''
    if (normalizedKey) {
      const keyId = uuidv4() as string
      keyPath = `/tmp/otomi/sshKey-${keyId}`
      await writeFile(keyPath, `${normalizedKey}\n`, { mode: 0o600 })
      await chmod(keyPath, 0o600)
      const GIT_SSH_COMMAND = `ssh -i ${keyPath} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`
      git.env('GIT_SSH_COMMAND', GIT_SSH_COMMAND)
    }
  } else if (url.startsWith('https://')) {
    if (!username || !accessToken) throw new Error('Username and access token are required for HTTPS authentication')
    url = repoUrl.replace('https://', `https://${encodeURIComponent(username)}:${encodeURIComponent(accessToken)}@`)
  } else throw new Error('Invalid repository URL format. Must be SSH or HTTPS.')

  return { git, url, keyPath }
}

export async function testPrivateRepoConnect(
  repoUrl: string,
  sshPrivateKey?: string,
  username?: string,
  accessToken?: string,
) {
  let keyPath: string | undefined
  try {
    const authResult = await setupGitAuthentication(repoUrl, sshPrivateKey, username, accessToken)
    keyPath = authResult.keyPath
    await authResult.git.listRemote([authResult.url])
    return { status: 'success' }
  } catch (error) {
    return { status: 'failed' }
  } finally {
    if (repoUrl.startsWith('git@') && keyPath && (await pathExists(keyPath))) await unlink(keyPath)
  }
}

export async function testPublicRepoConnect(repoUrl: string) {
  const git = simpleGit()
  try {
    await git.listRemote([repoUrl])
    return { status: 'success' }
  } catch (error) {
    return { status: 'failed' }
  }
}

export async function extractRepositoryRefs(repoUrl: string, git: SimpleGit = simpleGit()): Promise<string[]> {
  try {
    let formattedRepoUrl = repoUrl
    if (repoUrl.startsWith('https://gitea')) {
      git.env({
        GIT_ASKPASS: 'echo',
        GIT_TERMINAL_PROMPT: '0',
        GIT_SSL_NO_VERIFY: 'true',
      })
      const username = process.env.GIT_USER as string
      const accessToken = process.env.GIT_PASSWORD as string
      formattedRepoUrl = repoUrl.replace(
        'https://',
        `https://${encodeURIComponent(username)}:${encodeURIComponent(accessToken)}@`,
      )
    }

    const rawData = await git.listRemote(['--refs', formattedRepoUrl])
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
  } catch (error) {
    return []
  }
}

export async function getPrivateRepoBranches(
  repoUrl: string,
  sshPrivateKey?: string,
  username?: string,
  accessToken?: string,
) {
  let keyPath: string | undefined
  try {
    const authResult = await setupGitAuthentication(repoUrl, sshPrivateKey, username, accessToken)
    keyPath = authResult.keyPath
    return await extractRepositoryRefs(authResult.url, authResult.git)
  } catch (error) {
    return []
  } finally {
    if (repoUrl.startsWith('git@') && keyPath && (await pathExists(keyPath))) await unlink(keyPath)
  }
}

export async function getPublicRepoBranches(repoUrl: string) {
  const branches = await extractRepositoryRefs(repoUrl)
  return branches
}
