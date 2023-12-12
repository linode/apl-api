import { readFile } from 'fs-extra'
import { readdir } from 'fs/promises'
import shell from 'shelljs'
import YAML from 'yaml'

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
    gitUrl = `${protocol}://${process.env.GIT_USER}:${process.env.GIT_PASSWORD}@${bareUrl}`
  }
  shell.exec(`git clone --depth 1 ${gitUrl} ${helmChartsDir}`)
  const files = await readdir(`${helmChartsDir}`, 'utf-8')
  const filesToExclude = ['.git', '.gitignore', '.vscode', 'LICENSE', 'README.md']
  if (!version.startsWith('v1')) filesToExclude.push('deployment', 'ksvc')
  const folders = files.filter((f) => !filesToExclude.includes(f))

  let rbac = {}
  try {
    const r = await readFile(`${helmChartsDir}/rbac.yaml`, 'utf-8')
    rbac = YAML.parse(r).rbac
  } catch (error) {
    console.error(`Error while parsing rbac.yaml file : ${error.message}`)
  }

  const catalog: any[] = []
  const helmCharts: string[] = []
  for (const folder of folders) {
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
