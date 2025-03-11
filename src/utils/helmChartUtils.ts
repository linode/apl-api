/* eslint-disable no-useless-escape */
import axios from 'axios'
import yaml from 'js-yaml'

export const detectGitProvider = (url) => {
  if (!url || typeof url !== 'string') return null

  const normalizedUrl = url.replace(/\/*$/, '')

  const githubPattern = /github\.com\/([^\/]+)\/([^\/]+)(?:\/(?:blob|raw))?\/([^\/]+)\/(.+)/
  const githubRawPattern = /raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/
  const gitlabPattern = /gitlab\.com\/([^\/]+)\/([^\/]+)\/(?:\-\/(?:blob|raw))\/([^\/]+)\/(.+)/
  const bitbucketPattern = /bitbucket\.org\/([^\/]+)\/([^\/]+)\/(?:src|raw)\/([^\/]+)\/(.+)/

  let match = normalizedUrl.match(githubRawPattern)
  if (match)
    return { provider: 'github', owner: match[1], repo: match[2], branch: match[3], filePath: match[4], isRaw: true }

  match = normalizedUrl.match(githubPattern)
  if (match) return { provider: 'github', owner: match[1], repo: match[2], branch: match[3], filePath: match[4] }

  match = normalizedUrl.match(gitlabPattern)
  if (match) return { provider: 'gitlab', owner: match[1], repo: match[2], branch: match[3], filePath: match[4] }

  match = normalizedUrl.match(bitbucketPattern)
  if (match) return { provider: 'bitbucket', owner: match[1], repo: match[2], branch: match[3], filePath: match[4] }

  return null
}

const getGitRawUrl = (details) => {
  if (!details) return null

  if (details.provider === 'github')
    return `https://raw.githubusercontent.com/${details.owner}/${details.repo}/${details.branch}/${details.filePath}`
  if (details.provider === 'gitlab')
    return `https://gitlab.com/${details.owner}/${details.repo}/-/raw/${details.branch}/${details.filePath}`
  if (details.provider === 'bitbucket')
    return `https://bitbucket.org/${details.owner}/${details.repo}/raw/${details.branch}/${details.filePath}`

  return null
}

export const getGitCloneUrl = (details) => {
  if (!details) return null

  if (details.provider === 'github') return `https://github.com/${details.owner}/${details.repo}.git`
  if (details.provider === 'gitlab') return `https://gitlab.com/${details.owner}/${details.repo}.git`
  if (details.provider === 'bitbucket') return `https://bitbucket.org/${details.owner}/${details.repo}.git`

  return null
}

export const fetchChartYaml = async (url) => {
  try {
    const details = detectGitProvider(url)
    if (!details) return { values: {}, error: 'Unsupported Git provider or invalid URL format.' }

    const rawUrl = getGitRawUrl(details)
    if (!rawUrl) return { values: {}, error: `Could not generate raw URL for provider: ${details.provider}` }

    const response = await axios.get(rawUrl, { responseType: 'text' })
    return { values: yaml.load(response.data), error: '' }
  } catch (error) {
    console.error('Error fetching Chart.yaml:', error.message)
    return { values: {}, error: 'Error fetching helm chart content.' }
  }
}
