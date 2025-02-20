import { readFile } from 'fs-extra'
import { readdir } from 'fs/promises'
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
 * Clones a repository using sparse checkout, checks out a specific revision,
 * and moves the contents of the desired subdirectory (sparsePath) to the root of the target folder.
 *
 * @param url - The base Git repository URL (e.g. "https://github.com/nats-io/k8s.git")
 * @param chartName - The target folder name for the clone (will be the final chart folder, e.g. "nats")
 * @param chartPath - The path in github where the chart is located
 * @param sparsePath - The subdirectory to sparse checkout (e.g. "helm/charts/nats")
 * @param revision - The branch or commit to checkout (e.g. "main")
 */
export function sparseCloneChart(
  url: string,
  chartName: string,
  chartPath: string,
  sparsePath: string,
  revision: string,
): void {
  // Clone the repository into the folder named chartName
  // const checkoutPath = `${sparsePath}/${chartName}`
  const cloneCmd = `git clone --filter=blob:none --no-checkout ${url} ${sparsePath}`
  console.log(`Running: ${cloneCmd}`)
  shell.exec(cloneCmd)

  // Change directory to the newly cloned repository
  shell.cd(chartName)

  // Initialize sparse checkout in cone mode
  const initCmd = `git sparse-checkout init --cone`
  console.log(`Running: ${initCmd}`)
  shell.exec(initCmd)

  // Set the sparse checkout to only include the specified path
  const setCmd = `git sparse-checkout set ${chartPath}`
  console.log(`Running: ${setCmd}`)
  shell.exec(setCmd)

  // Checkout the desired revision (branch/commit)
  const checkoutCmd = `git checkout ${revision}`
  console.log(`Running: ${checkoutCmd}`)
  shell.exec(checkoutCmd)

  // Move the contents of the sparsePath directory to the repository root.
  // Note: The shell command expands the wildcard to all files and directories in sparsePath.
  const moveCmd = `mv ${sparsePath}/* .`
  console.log(`Running: ${moveCmd}`)
  shell.exec(moveCmd)

  // Remove the leftover directory structure.
  // Here we remove the top-level directory from sparsePath.
  const topLevelDir = sparsePath.split('/')[0]
  const removeCmd = `rm -rf ${topLevelDir}`
  console.log(`Running: ${removeCmd}`)
  shell.exec(removeCmd)

  // Change directory back to the parent directory
  shell.cd('..')
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
  // if (shouldClone) {
  //   shell.rm('-rf', helmChartsDir)
  //   shell.mkdir('-p', helmChartsDir)
  //   let gitUrl = url
  //   if (isGiteaURL(url)) {
  //     const [protocol, bareUrl] = url.split('://')
  //     const encodedUser = encodeURIComponent(process.env.GIT_USER as string)
  //     const encodedPassword = encodeURIComponent(process.env.GIT_PASSWORD as string)
  //     gitUrl = `${protocol}://${encodedUser}:${encodedPassword}@${bareUrl}`
  //   }
  //   shell.exec(`git clone --depth 1 ${gitUrl} ${helmChartsDir}`)
  // }

  if (newChart) sparseCloneChart(url, newChartName as string, newChartPath as string, helmChartsDir, version)

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
