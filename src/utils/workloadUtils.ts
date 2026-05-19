import axios from 'axios'
import Debug from 'debug'
import { existsSync, lstatSync, mkdirSync } from 'fs'
import { readFile } from 'fs-extra'
import { readdir } from 'fs/promises'
import path from 'path'
import { safeReadTextFile } from 'src/utils'
import {
  CATALOG_CACHE_REFRESH_INTERVAL_MS,
  CATALOG_CACHE_SYNC_MARKER,
  cleanEnv,
  GIT_PROVIDER_URL_PATTERNS,
} from 'src/validators'
import YAML from 'yaml'
import { BadRequestError } from '../error'

const debug = Debug('apl:workloadUtils')

const env = cleanEnv({
  CATALOG_CACHE_REFRESH_INTERVAL_MS,
  CATALOG_CACHE_SYNC_MARKER,
  GIT_PROVIDER_URL_PATTERNS,
})

export async function validateGitUrl(url: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new BadRequestError(`Invalid URL: ${url}`)
  }

  if (parsed.protocol !== 'https:') {
    throw new BadRequestError('Only HTTPS URLs are allowed for git repositories')
  }
}

export function isGiteaURL(url: string) {
  let hostname = ''
  if (url) {
    try {
      hostname = new URL(url).hostname
    } catch (e) {
      // ignore
      return false
    }
  }
  const giteaPattern = /^gitea\..+/i
  return giteaPattern.test(hostname)
}

export function isInteralGiteaURL(repositoryUrl: string, clusterDomainSuffix?: string) {
  if (!clusterDomainSuffix) return false
  try {
    const url = new URL(repositoryUrl)
    return url.hostname === `gitea.${clusterDomainSuffix}`
  } catch {
    return false
  }
}

export function detectGitProvider(url) {
  if (!url || typeof url !== 'string') return null

  const normalizedUrl = new URL(url).origin + new URL(url).pathname.replace(/\/*$/, '')

  const { github, gitlab, bitbucket } = env.GIT_PROVIDER_URL_PATTERNS as {
    github: string
    gitlab: string
    bitbucket: string
  }
  const githubPattern = new RegExp(github || 'github\\.com\\/([^\\/]+)\\/([^\\/]+)\\/(?:blob|raw)\\/([^\\/]+)\\/(.+)')
  const gitlabPattern = new RegExp(
    gitlab || 'gitlab\\.com\\/([^\\/]+)\\/([^\\/]+)(?:\\/([^\\/]+))?\\/(?:\\-\\/(?:blob|raw))\\/([^\\/]+)\\/(.+)',
  )
  const bitbucketPattern = new RegExp(
    bitbucket || 'bitbucket\\.org\\/([^\\/]+)\\/([^\\/]+)\\/(?:src|raw)\\/([^\\/]+)\\/(.+)',
  )

  let match = normalizedUrl.match(githubPattern)
  if (match) return { provider: 'github', owner: match[1], repo: match[2], branch: match[3], filePath: match[4] }

  match = normalizedUrl.match(gitlabPattern)
  if (match) {
    return {
      provider: 'gitlab',
      owner: match[1],
      repo: match[3] ? `${match[2]}/${match[3]}` : match[2], // Handle optional subgroup
      branch: match[4],
      filePath: match[5],
    }
  }

  match = normalizedUrl.match(bitbucketPattern)
  if (match) return { provider: 'bitbucket', owner: match[1], repo: match[2], branch: match[3], filePath: match[4] }

  return null
}

function getGitRawUrl(details) {
  if (!details) return null

  if (details.provider === 'github')
    return `https://raw.githubusercontent.com/${details.owner}/${details.repo}/${details.branch}/${details.filePath}`
  if (details.provider === 'gitlab')
    return `https://gitlab.com/${details.owner}/${details.repo}/-/raw/${details.branch}/${details.filePath}`
  if (details.provider === 'bitbucket')
    return `https://bitbucket.org/${details.owner}/${details.repo}/raw/${details.branch}/${details.filePath}`

  return null
}

export function getGitCloneUrl(details) {
  if (!details) return null

  if (details.provider === 'github') return `https://github.com/${details.owner}/${details.repo}.git`
  if (details.provider === 'gitlab') return `https://gitlab.com/${details.owner}/${details.repo}.git`
  if (details.provider === 'bitbucket') return `https://bitbucket.org/${details.owner}/${details.repo}.git`

  return null
}

export async function fetchChartYaml(url) {
  try {
    const details = detectGitProvider(url)
    if (!details) return { values: {}, error: 'Unsupported Git provider or invalid URL format.' }

    const rawUrl = getGitRawUrl(details)
    if (!rawUrl) return { values: {}, error: `Could not generate raw URL for provider: ${details.provider}` }

    const response = await axios.get(rawUrl, { responseType: 'text' })
    return { values: YAML.parse(response.data as string), error: '' }
  } catch (error) {
    console.error('Error fetching Chart.yaml:', error.message)
    return { values: {}, error: 'Error fetching helm chart content.' }
  }
}

export function getBranchesAndTags(remoteResult: string) {
  const lines = remoteResult.split('\n')
  const branches: string[] = []
  const tags: string[] = []

  lines.forEach((line) => {
    const parts = line.split('\t')
    if (parts.length === 2) {
      const ref = parts[1]
      if (ref.startsWith('refs/heads/')) branches.push(ref.replace('refs/heads/', ''))
      else if (ref.startsWith('refs/tags/')) tags.push(ref.replace('refs/tags/', ''))
    }
  })

  return { branches, tags }
}

export function findRevision(branches, tags, refAndPath) {
  const parts = refAndPath.split('/')
  const candidates = [parts[0], parts.slice(0, 2).join('/'), parts.slice(0, 3).join('/')]
  for (const candidate of candidates) if (branches.includes(candidate) || tags.includes(candidate)) return candidate
  return null
}

/**
 * Reads and parses the rbac.yaml file from a helm charts directory
 */
async function readRbacConfig(helmChartsDir: string): Promise<{ rbac: Record<string, any>; betaCharts: string[] }> {
  try {
    const fileContent = await readFile(`${helmChartsDir}/rbac.yaml`, 'utf-8')
    const parsed = YAML.parse(fileContent)
    return {
      rbac: parsed?.rbac || {},
      betaCharts: parsed?.betaCharts || [],
    }
  } catch (error) {
    debug(`Error while parsing rbac.yaml file : ${error.message}`)
    return { rbac: {}, betaCharts: [] }
  }
}

/**
 * Checks if a chart is accessible to a team based on RBAC rules
 */
function isChartAccessible(chartName: string, rbac: Record<string, any>, teamId?: string): boolean {
  // If no teamId provided, allow access (BYO catalog case)
  if (!teamId) return true

  // If chart not in rbac config, or rbac allows this team, or team is admin
  return !rbac[chartName] || rbac[chartName].includes(`team-${teamId}`) || teamId === 'admin'
}

/**
 * Reads chart README file with fallback message
 */
async function readChartReadme(helmChartsDir: string, folder: string): Promise<string> {
  try {
    return await safeReadTextFile(helmChartsDir, `${folder}/README.md`)
  } catch (error) {
    debug(`Error while parsing chart README.md file : ${error.message}`)
    return 'There is no `README` for this chart.'
  }
}

/**
 * Processes a single chart folder and returns catalog item
 */
async function processChartFolder(
  helmChartsDir: string,
  folder: string,
  betaCharts: string[],
): Promise<{
  name: string
  values: string
  valuesSchema: string
  icon?: string
  chartVersion?: string
  chartDescription?: string
  readme: string
  isBeta: boolean
} | null> {
  const readme = await readChartReadme(helmChartsDir, folder)

  try {
    const values = await safeReadTextFile(helmChartsDir, `${folder}/values.yaml`)

    let valuesSchema = '{}'
    try {
      const schemaContent = await safeReadTextFile(helmChartsDir, `${folder}/values.schema.json`)
      valuesSchema = schemaContent || '{}'
    } catch {
      // values.schema.json is optional
    }

    const chart = await safeReadTextFile(helmChartsDir, `${folder}/Chart.yaml`)
    const chartMetadata = YAML.parse(chart)

    return {
      name: folder,
      values: values || '{}',
      valuesSchema,
      icon: chartMetadata?.icon,
      chartVersion: chartMetadata?.version,
      chartDescription: chartMetadata?.description,
      readme,
      isBeta: betaCharts.includes(folder),
    }
  } catch (error) {
    debug(`Error while parsing ${folder}/Chart.yaml and ${folder}/values.yaml files : ${error.message}`)
    return null
  }
}

/**
 * Gets list of chart folders from directory, excluding system files
 */
async function getChartFolders(helmChartsDir: string): Promise<string[]> {
  const files = await readdir(helmChartsDir, 'utf-8')
  const chartFolders = await Promise.all(
    files.map(async (fileName) => {
      try {
        if (fileName.startsWith('.')) return null
        const filePath = path.join(helmChartsDir, fileName)
        if (!lstatSync(filePath).isDirectory()) return null

        try {
          await safeReadTextFile(helmChartsDir, `${fileName}/Chart.yaml`)
          return fileName
        } catch {
          await safeReadTextFile(helmChartsDir, `${fileName}/chart.yaml`)
          return fileName
        }
      } catch {
        return null
      }
    }),
  )

  return chartFolders.filter((folder): folder is string => folder !== null)
}

/**
 * Fetches workload catalog from a Git repository
 *
 * @param url - Git repository URL
 * @param helmChartsDir - Local directory to clone charts into
 * @param branch - Git branch to checkout (defaults to 'main')
 * @param clusterDomainSuffix - Cluster domain suffix for internal Gitea URL detection
 * @param teamId - Optional team ID for RBAC filtering. If not provided, all charts are returned
 * @param chartsPath - Optional subdirectory path where charts are located (e.g., 'charts' or 'helm-charts')
 */
export async function fetchWorkloadCatalog(
  url: string,
  helmChartsDir: string,
  branch: string = 'main',
  clusterDomainSuffix?: string,
  teamId?: string,
  chartsPath?: string,
  forceRefresh: boolean = false,
): Promise<{ helmCharts: string[]; catalog: any[] }> {
  const resolvedHelmChartsDir = path.resolve(helmChartsDir)

  // Ensure directory exists
  if (!existsSync(resolvedHelmChartsDir)) mkdirSync(resolvedHelmChartsDir, { recursive: true })

  // Determine the charts directory path
  const chartsDir = chartsPath ? path.resolve(resolvedHelmChartsDir, chartsPath) : resolvedHelmChartsDir

  const isWithinHelmChartsDir =
    chartsDir === resolvedHelmChartsDir || chartsDir.startsWith(`${resolvedHelmChartsDir}${path.sep}`)
  if (!isWithinHelmChartsDir) {
    debug(`Charts subdirectory '${chartsPath}' resolves outside '${resolvedHelmChartsDir}'`)
    return { helmCharts: [], catalog: [] }
  }

  // Check if subdirectory exists
  if (chartsPath && !existsSync(chartsDir)) {
    debug(`Charts subdirectory '${chartsPath}' not found at '${url}'`)
    return { helmCharts: [], catalog: [] }
  }

  if (chartsPath) {
    try {
      if (!lstatSync(chartsDir).isDirectory()) {
        debug(`Charts path '${chartsPath}' is not a directory at '${url}'`)
        return { helmCharts: [], catalog: [] }
      }
    } catch {
      debug(`Unable to stat charts subdirectory '${chartsPath}' at '${url}'`)
      return { helmCharts: [], catalog: [] }
    }
  }

  // Get chart folders
  const folders = await getChartFolders(chartsDir)
  if (!folders.length) {
    debug(`No chart folders found in '${chartsDir}' at '${url}'`)
    return { helmCharts: [], catalog: [] }
  }
  // Read RBAC configuration (try chartsDir first, fallback to root)
  let rbacConfig = await readRbacConfig(chartsDir)
  if (!rbacConfig.rbac || Object.keys(rbacConfig.rbac).length === 0) {
    rbacConfig = await readRbacConfig(helmChartsDir)
  }
  const { rbac, betaCharts } = rbacConfig

  // Process each chart folder
  const catalog: any[] = []
  const helmCharts: string[] = []

  for (const folder of folders) {
    // Check RBAC access
    if (!isChartAccessible(folder, rbac, teamId)) continue

    const catalogItem = await processChartFolder(chartsDir, folder, betaCharts)
    if (catalogItem) {
      catalog.push(catalogItem)
      helmCharts.push(folder)
    }
  }

  if (!catalog.length) debug(`There are no directories at '${url}'`)

  return { helmCharts, catalog }
}
