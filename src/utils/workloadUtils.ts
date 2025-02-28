import { existsSync, mkdirSync, readFile, renameSync, rmSync } from 'fs-extra'
import { readdir, writeFile } from 'fs/promises'
import path from 'path'
import shell from 'shelljs'
import simpleGit from 'simple-git'
import YAML from 'yaml'

export interface NewChartValues {
  url: string
  chartName: string
  chartIcon?: string
  chartPath: string
  revision: string
  allowTeams: boolean
}

export interface NewChartPayload extends NewChartValues {
  teamId: string
  userSub: string
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
 * @param chartYamlPath - Path to Chart.yaml (e.g. "/tmp/otomi/charts/mock-sub-value/cassandra/Chart.yaml")
 * @param newIcon - The user-selected icon URL.
 */
export async function updateChartIconInYaml(chartYamlPath: string, newIcon: string): Promise<void> {
  try {
    const fileContent = await readFile(chartYamlPath, 'utf-8')
    const chartObject = YAML.parse(fileContent)
    if (newIcon && newIcon.trim() !== '') chartObject.icon = newIcon

    const newContent = YAML.stringify(chartObject)
    await writeFile(chartYamlPath, newContent, 'utf-8')
    console.log(`Updated icon in ${chartYamlPath} to ${newIcon}`)
  } catch (error) {
    console.error(`Error updating chart icon in ${chartYamlPath}:`, error)
  }
}

/**
 * Updates the rbac.yaml file in the specified folder by adding a new chart key.
 *
 * @param sparsePath - The folder where rbac.yaml resides (e.g. "/tmp/otomi/charts/mock-sub-value")
 * @param chartKey - The key to add under the "rbac" section (e.g. "quickstart-cassandra")
 * @param allowTeams - Boolean indicating if teams are allowed to use the chart.
 *                     If false, the key is set to [].
 *                     If true, the key is set to null.
 */
export async function updateRbacForNewChart(sparsePath: string, chartKey: string, allowTeams: boolean): Promise<void> {
  const rbacFilePath = `${sparsePath}/rbac.yaml`
  let rbacData: any = {}
  console.log('update rbac reach rbacFilePath', rbacFilePath)
  try {
    const fileContent = await readFile(rbacFilePath, 'utf-8')
    rbacData = YAML.parse(fileContent) || {}
  } catch (error) {
    console.error('Error reading rbac.yaml:', error)
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
  console.log(`Updated rbac.yaml: added ${chartKey}: ${allowTeams ? 'null' : '[]'}`)
}

async function commitAndPush(targetDir: string, helmChartCatalogUrl: string) {
  const git = simpleGit(targetDir)

  try {
    if (!existsSync(path.join(targetDir, '.git'))) {
      console.log('Initializing new Git repository')
      await git.init()
      await git.addRemote('origin', helmChartCatalogUrl)
    }

    console.log('Staging new changes')
    await git.add('.')

    console.log('Committing changes')
    await git.commit('Added new Helm chart')

    console.log('Pulling latest changes with rebase')
    await git.pull('origin', 'main', { '--rebase': null })

    console.log('Pushing changes to remote')
    await git.push('origin', 'main')

    console.log('Successfully pushed changes!')
  } catch (error) {
    console.error('Error during commit and push:', error)
  }
}

/**
 * Clones a repository using sparse checkout, checks out a specific revision,
 * and moves the contents of the desired subdirectory (sparsePath) to the root of the target folder.
 *
 * @param url - The base Git repository URL (e.g. "https://github.com/nats-io/k8s.git")
 * @param chartName - The target folder name for the clone (will be the final chart folder, e.g. "nats")
 * @param chartPath - The path in github where the chart is located
 * @param sparsePath - The subdirectory to sparse checkout (e.g. "helm/charts/nats")
 * @param revision - The branch or commit to checkout (e.g. "main")
 * @param chartIcon - the icon URL path (e.g https://myimage.com/imageurl)
 * @param allowTeams - Boolean indicating if teams are allowed to use the chart.
 *                     If false, the key is set to [].
 *                     If true, the key is set to null.
 */
export async function sparseCloneChart(
  url: string,
  helmChartCatalogUrl: string,
  chartName: string,
  chartPath: string,
  sparsePath: string, // e.g. "/tmp/otomi/charts/mock-sub-value"
  revision: string,
  chartIcon?: string,
  allowTeams?: boolean,
): Promise<void> {
  const temporaryCloneDir = `${sparsePath}-new` // Temporary clone directory
  const checkoutPath = `${sparsePath}/${chartName}` // Final destination

  if (!existsSync(temporaryCloneDir)) mkdirSync(temporaryCloneDir, { recursive: true })
  else {
    rmSync(temporaryCloneDir, { recursive: true, force: true })
    mkdirSync(temporaryCloneDir, { recursive: true })
  }

  const git = simpleGit()

  // Clone the repository into the folder named checkoutPath.
  console.log(`Cloning repository: ${url} into ${checkoutPath}`)
  await git.clone(url, temporaryCloneDir, ['--filter=blob:none', '--no-checkout'])

  // Initialize sparse checkout in cone mode within checkoutPath.
  console.log(`Initializing sparse checkout in cone mode at ${checkoutPath}`)
  await git.cwd(temporaryCloneDir)
  await git.raw(['sparse-checkout', 'init', '--cone'])

  // Set the sparse checkout to only include the specified chartPath.
  console.log(`Setting sparse checkout path to ${chartPath}`)
  await git.raw(['sparse-checkout', 'set', chartPath])

  // Checkout the desired revision (branch or commit) within checkoutPath.
  console.log(`Checking out revision: ${revision}`)
  await git.checkout(revision)

  // Move the contents of the sparse folder (chartPath) to the repository root.
  // This moves files from "checkoutPath/chartPath/*" to "checkoutPath/"
  renameSync(path.join(temporaryCloneDir, chartPath), checkoutPath)

  // Remove the leftover temporary clone directory.
  // For chartPath "bitnami/cassandra", the top-level folder is "bitnami".
  rmSync(temporaryCloneDir, { recursive: true, force: true })

  // Update Chart.yaml with the new icon if one is provided.
  if (chartIcon && chartIcon.trim() !== '') {
    const chartYamlPath = `${checkoutPath}/Chart.yaml`
    await updateChartIconInYaml(chartYamlPath, chartIcon)
  }

  // update rbac file
  await updateRbacForNewChart(sparsePath, chartName, allowTeams as boolean)

  // pull&push new chart changes
  await commitAndPush(sparsePath, helmChartCatalogUrl)
}

export async function fetchWorkloadCatalog(
  url: string,
  sub: string,
  teamId: string,
  version: string,
): Promise<Promise<any>> {
  const helmChartsDir = `/tmp/otomi/charts/${sub}`
  shell.rm('-rf', helmChartsDir)
  shell.mkdir('-p', helmChartsDir)
  let gitUrl = url
  if (isGiteaURL(url)) {
    const [protocol, bareUrl] = url.split('://')
    const encodedUser = encodeURIComponent(process.env.GIT_USER as string)
    const encodedPassword = encodeURIComponent(process.env.GIT_PASSWORD as string)
    gitUrl = `${protocol}://${encodedUser}:${encodedPassword}@${bareUrl}`
  }
  shell.exec(`git clone --depth 1 ${gitUrl} ${helmChartsDir}`)
  const files = await readdir(`${helmChartsDir}`, 'utf-8')
  const filesToExclude = ['.git', '.gitignore', '.vscode', 'LICENSE', 'README.md']
  if (!version.startsWith('v1')) filesToExclude.push('deployment', 'ksvc')
  const folders = files.filter((f) => !filesToExclude.includes(f))

  let rbac = {}
  let betaCharts: string[] = []
  try {
    const r = await readFile(`${helmChartsDir}/rbac.yaml`, 'utf-8')
    rbac = YAML.parse(r).rbac
    if (YAML.parse(r)?.betaCharts) betaCharts = YAML.parse(r).betaCharts
  } catch (error) {
    console.error(`Error while parsing rbac.yaml file : ${error.message}`)
  }
  const catalog: any[] = []
  const helmCharts: string[] = []
  for (const folder of folders) {
    let readme = ''
    try {
      const chartReadme = await readFile(`${helmChartsDir}/${folder}/README.md`, 'utf-8')
      readme = chartReadme
    } catch (error) {
      console.error(`Error while parsing chart README.md file : ${error.message}`)
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
      console.error(`Error while parsing ${folder}/Chart.yaml and ${folder}/values.yaml files : ${error.message}`)
    }
  }
  if (!catalog.length) throwChartError(`There are no directories at '${url}'`)
  return { helmCharts, catalog }
}
