import axios from 'axios'
import Debug from 'debug'
import { existsSync, mkdirSync, renameSync, rmSync } from 'fs'
import { readFile } from 'fs-extra'
import { readdir, writeFile } from 'fs/promises'
import path from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import { GIT_PROVIDER_URL_PATTERNS, cleanEnv } from 'src/validators'
import YAML from 'yaml'

const debug = Debug('apl:workloadUtils')

const env = cleanEnv({
  GIT_PROVIDER_URL_PATTERNS,
})

export interface NewHelmChartValues {
  gitRepositoryUrl: string
  chartTargetDirName: string
  chartIcon?: string
  allowTeams: boolean
}

function throwChartError(message: string) {
  const err = {
    code: 404,
    message,
  }
  throw err
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
 * Reads the Chart.yaml file at the given path, updates (or sets) its icon field,
 * and writes the updated content back to disk.
 *
 * @param chartYamlPath - Path to Chart.yaml (e.g. "/tmp/otomi/charts/uuid/cassandra/Chart.yaml")
 * @param newIcon - The user-selected icon URL.
 */
export async function updateChartIconInYaml(chartYamlPath: string, newIcon: string): Promise<void> {
  try {
    const fileContent = await readFile(chartYamlPath, 'utf-8')
    const chartObject = YAML.parse(fileContent)
    if (newIcon && newIcon.trim() !== '') chartObject.icon = newIcon
    const newContent = YAML.stringify(chartObject)
    await writeFile(chartYamlPath, newContent, 'utf-8')
  } catch (error) {
    debug(`Error updating chart icon in ${chartYamlPath}:`, error)
  }
}
/**
 * Updates the rbac.yaml file in the specified folder by adding a new chart key.
 *
 * @param sparsePath - The folder where rbac.yaml resides (e.g. "/tmp/otomi/charts/uuid")
 * @param chartKey - The key to add under the "rbac" section (e.g. "quickstart-cassandra")
 * @param allowTeams - Boolean indicating if teams are allowed to use the chart.
 *                     If false, the key is set to [].
 *                     If true, the key is set to null.
 */
export async function updateRbacForNewChart(sparsePath: string, chartKey: string, allowTeams: boolean): Promise<void> {
  const rbacFilePath = `${sparsePath}/rbac.yaml`
  let rbacData: any = {}
  debug('update rbac reach rbacFilePath', rbacFilePath)
  try {
    const fileContent = await readFile(rbacFilePath, 'utf-8')
    rbacData = YAML.parse(fileContent) || {}
  } catch (error) {
    debug('Error reading rbac.yaml:', error)
    // Create a default structure if the file doesn't exist.
    rbacData = { rbac: {}, betaCharts: [] }
  }
  // Ensure the "rbac" section exists.
  if (!rbacData.rbac) rbacData.rbac = {}
  // Add the new chart entry if it doesn't exist.
  // If allowTeams is false, set the value to an empty array ([]),
  // otherwise (if true) set it to null.
  if (!(chartKey in rbacData.rbac)) rbacData.rbac[chartKey] = allowTeams ? null : []
  // Stringify the updated YAML content and write it back.
  const newContent = YAML.stringify(rbacData)
  await writeFile(rbacFilePath, newContent, 'utf-8')
  debug(`Updated rbac.yaml: added ${chartKey}: ${allowTeams ? 'null' : '[]'}`)
}

export class chartRepo {
  localPath: string
  chartRepoUrl: string
  gitUser?: string
  gitEmail?: string
  git: SimpleGit
  constructor(localPath: string, chartRepoUrl: string, gitUser?: string, gitEmail?: string) {
    this.localPath = localPath
    this.chartRepoUrl = chartRepoUrl
    this.gitUser = gitUser
    this.gitEmail = gitEmail
    this.git = simpleGit(this.localPath)
  }
  async clone(branch: string = 'main') {
    await this.git.clone(this.chartRepoUrl, this.localPath, ['--branch', branch, '--single-branch'])
  }
  async cloneSingleChart(refAndPath: string, finalDestinationPath: string) {
    const remoteResult = await this.git.listRemote([this.chartRepoUrl])
    const { branches, tags } = getBranchesAndTags(remoteResult)
    const finalRevision = findRevision(branches, tags, refAndPath) as string
    const finalFilePath = refAndPath.slice(finalRevision?.length + 1)

    debug(`Cloning repository: ${this.chartRepoUrl} into ${this.localPath}`)
    await this.git.clone(this.chartRepoUrl, this.localPath, ['--filter=blob:none', '--no-checkout'])

    debug(`Initializing sparse checkout in cone mode at ${this.localPath}`)
    await this.git.cwd(this.localPath)
    await this.git.raw(['sparse-checkout', 'init', '--cone'])

    debug(`Setting sparse checkout path to ${finalFilePath}`)
    await this.git.raw(['sparse-checkout', 'set', finalFilePath])

    debug(`Checking out the desired revision (branch or commit): ${finalRevision}`)
    await this.git.checkout(finalRevision)

    // Move files from "temporaryCloneDir/chartPath/*" to "finalDestinationPath/"
    renameSync(path.join(this.localPath, finalFilePath), finalDestinationPath)
  }
  async addConfig() {
    await this.git.addConfig('user.name', this.gitUser!)
    await this.git.addConfig('user.email', this.gitEmail!)
  }
  async commitAndPush(chartName: string) {
    await this.git.add('.')
    await this.git.commit(`Add ${chartName} helm chart`)
    await this.git.pull('origin', 'refs/heads/main', { '--rebase': null })
    await this.git.push('origin', 'refs/heads/main')
  }
}

/**
 * Clones a repository using sparse checkout, checks out a specific revision,
 * and moves the contents of the desired subdirectory (sparsePath) to the root of the target folder.
 *
 * @param gitRepositoryUrl - The base Git repository URL (e.g. "https://github.com/nats-io/k8s.git")
 * @param localHelmChartsDir - The subdirectory to sparse checkout (e.g. "/tmp/otomi/charts/uuid")
 * @param helmChartCatalogUrl - The URL of the (Gitea) Helm Chart Catalog (e.g. "https://gitea.<domainSuffix>/otomi/charts.git")
 * @param user - The Git username (e.g. "otomi-admin")
 * @param email - The Git email (e.g. "not@us.ed")
 * @param chartTargetDirName - The target folder name for the clone (will be the final chart folder, e.g. "nats")
 * @param chartIcon - the icon URL path (e.g https://myimage.com/imageurl)
 * @param allowTeams - Boolean indicating if teams are allowed to use the chart.
 *                     If false, the key is set to [].
 *                     If true, the key is set to null.
 */
export async function sparseCloneChart(
  gitRepositoryUrl: string,
  localHelmChartsDir: string,
  helmChartCatalogUrl: string,
  user: string,
  email: string,
  chartTargetDirName: string,
  chartIcon?: string,
  allowTeams?: boolean,
): Promise<boolean> {
  const details = detectGitProvider(gitRepositoryUrl)
  if (!details) return false
  const gitCloneUrl = getGitCloneUrl(details) as string
  const refAndPath = `${details.branch}/${details.filePath.replace('Chart.yaml', '')}`
  const temporaryCloneDir = `${localHelmChartsDir}-newChart`
  const finalDestinationPath = `${localHelmChartsDir}/${chartTargetDirName}`

  if (!existsSync(localHelmChartsDir)) mkdirSync(localHelmChartsDir, { recursive: true })
  let gitUrl = helmChartCatalogUrl
  if (isGiteaURL(helmChartCatalogUrl)) {
    const [protocol, bareUrl] = helmChartCatalogUrl.split('://')
    const encodedUser = encodeURIComponent(process.env.GIT_USER as string)
    const encodedPassword = encodeURIComponent(process.env.GIT_PASSWORD as string)
    gitUrl = `${protocol}://${encodedUser}:${encodedPassword}@${bareUrl}`
  }
  const gitRepo = new chartRepo(localHelmChartsDir, gitUrl, user, email)
  await gitRepo.clone()

  if (!existsSync(temporaryCloneDir)) mkdirSync(temporaryCloneDir, { recursive: true })
  else {
    rmSync(temporaryCloneDir, { recursive: true, force: true })
    mkdirSync(temporaryCloneDir, { recursive: true })
  }

  const gitSingleChart = new chartRepo(temporaryCloneDir, gitCloneUrl)
  await gitSingleChart.cloneSingleChart(refAndPath, finalDestinationPath)

  // Remove the .git directory from the final destination.
  rmSync(`${finalDestinationPath}/.git`, { recursive: true, force: true })

  // Remove the leftover temporary clone directory.
  rmSync(temporaryCloneDir, { recursive: true, force: true })

  // Update Chart.yaml with the new icon if one is provided.
  if (chartIcon && chartIcon.trim() !== '') {
    const chartYamlPath = `${finalDestinationPath}/Chart.yaml`
    await updateChartIconInYaml(chartYamlPath, chartIcon)
  }

  // update rbac file
  await updateRbacForNewChart(localHelmChartsDir, chartTargetDirName, allowTeams as boolean)

  // pull&push new chart changes
  await gitRepo.addConfig()
  await gitRepo.commitAndPush(chartTargetDirName)

  return true
}

export async function fetchWorkloadCatalog(url: string, helmChartsDir: string, teamId: string): Promise<Promise<any>> {
  if (!existsSync(helmChartsDir)) mkdirSync(helmChartsDir, { recursive: true })
  let gitUrl = url
  if (isGiteaURL(url)) {
    const [protocol, bareUrl] = url.split('://')
    const encodedUser = encodeURIComponent(process.env.GIT_USER as string)
    const encodedPassword = encodeURIComponent(process.env.GIT_PASSWORD as string)
    gitUrl = `${protocol}://${encodedUser}:${encodedPassword}@${bareUrl}`
  }
  const gitRepo = new chartRepo(helmChartsDir, gitUrl)
  const branch = 'main'
  await gitRepo.clone(branch)

  const files = await readdir(helmChartsDir, 'utf-8')
  const filesToExclude = ['.git', '.gitignore', '.vscode', 'LICENSE', 'README.md']
  const folders = files.filter((f) => !filesToExclude.includes(f))

  let rbac = {}
  let betaCharts: string[] = []
  try {
    const r = await readFile(`${helmChartsDir}/rbac.yaml`, 'utf-8')
    rbac = YAML.parse(r).rbac
    if (YAML.parse(r)?.betaCharts) betaCharts = YAML.parse(r).betaCharts
  } catch (error) {
    debug(`Error while parsing rbac.yaml file : ${error.message}`)
  }
  const catalog: any[] = []
  const helmCharts: string[] = []
  for (const folder of folders) {
    let readme = ''
    try {
      const chartReadme = await readFile(`${helmChartsDir}/${folder}/README.md`, 'utf-8')
      readme = chartReadme
    } catch (error) {
      debug(`Error while parsing chart README.md file : ${error.message}`)
      readme = 'There is no `README` for this chart.'
    }
    try {
      const values = await readFile(`${helmChartsDir}/${folder}/values.yaml`, 'utf-8')
      // valuesSchema is optional, hence we add a catch at the end to mitigate a loop break out
      const valuesSchema = await readFile(`${helmChartsDir}/${folder}/values.schema.json`, 'utf-8').catch(() => null)
      const chart = await readFile(`${helmChartsDir}/${folder}/Chart.yaml`, 'utf-8')
      const chartMetadata = YAML.parse(chart)
      if (!rbac[folder] || rbac[folder].includes(`team-${teamId}`) || teamId === 'admin') {
        const catalogItem = {
          name: folder,
          values: values || '{}',
          valuesSchema: valuesSchema || '{}',
          icon: chartMetadata?.icon,
          chartVersion: chartMetadata?.version,
          chartDescription: chartMetadata?.description,
          readme,
          isBeta: betaCharts.includes(folder),
        }
        catalog.push(catalogItem)
        helmCharts.push(folder)
      }
    } catch (error) {
      debug(`Error while parsing ${folder}/Chart.yaml and ${folder}/values.yaml files : ${error.message}`)
    }
  }
  if (!catalog.length) throwChartError(`There are no directories at '${url}'`)
  return { helmCharts, catalog }
}
