/* eslint-disable no-useless-escape */
import axios from 'axios'
import Debug from 'debug'
import { existsSync, mkdirSync, readFile, renameSync, rmSync } from 'fs-extra'
import { readdir, writeFile } from 'fs/promises'
import path from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import YAML from 'yaml'

const debug = Debug('apl:workloadUtils')

export function detectGitProvider(url) {
  if (!url || typeof url !== 'string') return null

  const normalizedUrl = new URL(url).origin + new URL(url).pathname.replace(/\/*$/, '')

  const githubPattern = /github\.com\/([^\/]+)\/([^\/]+)\/(?:blob|raw)\/([^\/]+)\/(.+)/
  const gitlabPattern = /gitlab\.com\/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?\/(?:\-\/(?:blob|raw))\/([^\/]+)\/(.+)/
  const bitbucketPattern = /bitbucket\.org\/([^\/]+)\/([^\/]+)\/(?:src|raw)\/([^\/]+)\/(.+)/

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
function isGiteaURL(url: string) {
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
class chartRepo {
  localPath: string
  chartRepoUrl: string
  gitUser?: string
  gitEmail?: string
  git: SimpleGit
  constructor(localPath: string, chartRepoUrl: string, gitUser: string | undefined, gitEmail: string | undefined) {
    this.localPath = localPath
    this.chartRepoUrl = chartRepoUrl
    this.gitUser = gitUser
    this.gitEmail = gitEmail
    this.git = simpleGit(this.localPath)
  }
  async clone() {
    await this.git.clone(this.chartRepoUrl, this.localPath)
  }
  async addConfig() {
    await this.git.addConfig('user.name', this.gitUser!)
    await this.git.addConfig('user.email', this.gitEmail!)
  }
  async commitAndPush(chartName: string) {
    await this.git.add('.')
    await this.git.commit(`Add ${chartName} helm chart`)
    await this.git.pull('origin', 'main', { '--rebase': null })
    await this.git.push('origin', 'main')
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
  const gitCloneUrl = getGitCloneUrl(details) as string
  const chartPath = details?.filePath.replace('Chart.yaml', '') as string
  const revision = details?.branch as string
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

  const git = simpleGit()

  debug(`Cloning repository: ${gitCloneUrl} into ${temporaryCloneDir}`)
  await git.clone(gitCloneUrl, temporaryCloneDir, ['--filter=blob:none', '--no-checkout'])

  debug(`Initializing sparse checkout in cone mode at ${temporaryCloneDir}`)
  await git.cwd(temporaryCloneDir)
  await git.raw(['sparse-checkout', 'init', '--cone'])

  debug(`Setting sparse checkout path to ${chartPath}`)
  await git.raw(['sparse-checkout', 'set', chartPath])

  debug(`Checking out the desired revision (branch or commit): ${revision}`)
  await git.checkout(revision)

  // Move files from "temporaryCloneDir/chartPath/*" to "finalDestinationPath/"
  renameSync(path.join(temporaryCloneDir, chartPath), finalDestinationPath)

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
  const gitRepo = new chartRepo(helmChartsDir, gitUrl, undefined, undefined)
  await gitRepo.clone()

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
      const c = await readFile(`${helmChartsDir}/${folder}/Chart.yaml`, 'utf-8')
      const chartMetadata = YAML.parse(c)
      if (!rbac[folder] || rbac[folder].includes(`team-${teamId}`) || teamId === 'admin') {
        const catalogItem = {
          name: folder,
          values,
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
