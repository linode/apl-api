import { readFile } from 'fs-extra'
import { readdir, writeFile } from 'fs/promises'
import shell from 'shelljs'
import YAML from 'yaml'

export interface NewChartValues {
  url: string
  chartName: string
  chartIcon?: string
  chartPath: string
  revision: string
}

export interface NewChartPayload extends NewChartValues {
  teamId: string
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
 * Updates the rbac.yaml file in the specified folder by adding a new chart key.
 *
 * @param sparsePath - The folder where rbac.yaml resides (e.g. "/tmp/otomi/charts/mock-sub-value")
 * @param chartKey - The key to add under the "rbac" section (e.g. "quickstart-cassandra")
 */
export async function updateRbacForNewChart(sparsePath: string, chartKey: string): Promise<void> {
  const rbacFilePath = `${sparsePath}/rbac.yaml`
  let rbacData: any = {}
  console.log('update rbac reach rbacFilePath', rbacFilePath)
  try {
    const fileContent = await readFile(rbacFilePath, 'utf-8')
    rbacData = YAML.parse(fileContent) || {}
  } catch (error) {
    console.error('Error reading rbac.yaml:', error)
    // Optionally, create a default structure if the file doesn't exist.
    rbacData = { rbac: {}, betaCharts: [] }
  }

  // Ensure the "rbac" section exists.
  if (!rbacData.rbac) rbacData.rbac = {}

  // Add the new chart entry if it doesn't exist.
  if (!(chartKey in rbacData.rbac)) rbacData.rbac[chartKey] = null

  // Stringify the updated YAML content and write it back.
  const newContent = YAML.stringify(rbacData)
  await writeFile(rbacFilePath, newContent, 'utf-8')
  console.log(`Updated rbac.yaml: added ${chartKey}: null`)
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
 */
export async function sparseCloneChart(
  url: string, // e.g. "https://github.com/bitnami/charts.git"
  chartName: string, // e.g. "cassandra"
  chartPath: string, // e.g. "bitnami/cassandra"
  sparsePath: string, // e.g. "/tmp/otomi/charts/mock-sub-value"
  revision: string, // e.g. "main"
): Promise<void> {
  // The final folder where the chart will reside.
  const checkoutPath = `${sparsePath}/${chartName}`

  // Clone the repository into the folder named checkoutPath.
  const cloneCmd = `git clone --filter=blob:none --no-checkout ${url} ${checkoutPath}`
  console.log(`Running clone cmd: ${cloneCmd}`)
  shell.exec(cloneCmd)

  // Initialize sparse checkout in cone mode within checkoutPath.
  const initCmd = `git sparse-checkout init --cone`
  console.log(`Running init cmd: ${initCmd}`)
  shell.exec(initCmd, { cwd: checkoutPath })

  // Set the sparse checkout to only include the specified chartPath.
  const setCmd = `git sparse-checkout set ${chartPath}`
  console.log(`Running set cmd: ${setCmd}`)
  shell.exec(setCmd, { cwd: checkoutPath })

  // Checkout the desired revision (branch or commit) within checkoutPath.
  const checkoutCmd = `git checkout ${revision}`
  console.log(`Running checkout cmd: ${checkoutCmd}`)
  shell.exec(checkoutCmd, { cwd: checkoutPath })

  // Move the contents of the sparse folder (chartPath) to the repository root.
  // This moves files from "checkoutPath/chartPath/*" to "checkoutPath/"
  const moveCmd = `mv ${chartPath}/* .`
  console.log(`Running move cmd: ${moveCmd}`)
  shell.exec(moveCmd, { cwd: checkoutPath })

  // Remove the leftover top-level directory.
  // For chartPath "bitnami/cassandra", the top-level folder is "bitnami".
  const topLevelDir = chartPath.split('/')[0]
  const removeCmd = `rm -rf ${topLevelDir}`
  console.log(`Running remove cmd: ${removeCmd}`)
  shell.exec(removeCmd, { cwd: checkoutPath })

  const chartKey = `quickstart-${chartName}`
  // update rbac file
  await updateRbacForNewChart(sparsePath, chartKey)
}

export async function fetchWorkloadCatalog(
  url: string,
  sub: string,
  teamId: string,
  version: string,
  newChart?: boolean,
  newChartName?: string,
  newChartPath?: string,
): Promise<any> {
  const helmChartsDir = `/tmp/otomi/charts/${sub}`
  const helmChartsRootDir = `/tmp/otomi/charts/mock-sub-value`

  // Check if the directory exists and is non-empty.
  let shouldClone = false
  if (!shell.test('-d', helmChartsDir)) shouldClone = true
  else {
    try {
      const files = await readdir(helmChartsDir, 'utf-8')
      if (files.length === 0) shouldClone = true
    } catch (error) {
      console.error('Error reading directory, will re-clone:', error)
      shouldClone = true
    }
  }

  // Only remove and re-clone if needed.
  if (shouldClone) {
    console.log('halo should be cloning')
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
  }

  if (newChart) await sparseCloneChart(url, newChartName as string, newChartPath as string, helmChartsDir, version)

  // Read the folder contents.
  const files = await readdir(helmChartsDir, 'utf-8')
  const filesToExclude = ['.git', '.gitignore', '.vscode', 'LICENSE', 'README.md']
  if (!version.startsWith('v1')) filesToExclude.push('deployment', 'ksvc')
  const folders = files.filter((f) => !filesToExclude.includes(f))

  let rbac = {}
  let betaCharts: string[] = []
  try {
    let r = ''
    // When adding a new chart, read RBAC from a different folder.
    if (newChart) r = await readFile(`${helmChartsRootDir}/rbac.yaml`, 'utf-8')
    else r = await readFile(`${helmChartsDir}/rbac.yaml`, 'utf-8')
    const parsed = YAML.parse(r)
    rbac = parsed.rbac
    if (parsed?.betaCharts) betaCharts = parsed.betaCharts
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
