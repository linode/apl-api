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

export async function getWorkloadCatalog(url: string): Promise<Promise<any>> {
  const timestamp = new Date('2023-10-10T00:00:00.000').getTime()
  const helmChartsDir = `/tmp/otomi/charts/${timestamp}`
  shell.mkdir('-p', helmChartsDir)
  let gitUrl = url

  if (isGiteaURL(url)) {
    const [protocol, bareUrl] = url.split('://')
    gitUrl = `${protocol}://${process.env.GIT_USER}:${process.env.GIT_PASSWORD}@${bareUrl}`
  }

  shell.exec(`git clone --depth 1 ${gitUrl} ${helmChartsDir}`)
  const folders = await readdir(`${helmChartsDir}`, 'utf-8')

  const catalog: any[] = []
  const helmCharts: string[] = []
  for (const folder of folders) {
    try {
      const v = await readFile(`${helmChartsDir}/${folder}/values.yaml`, 'utf-8')
      const c = await readFile(`${helmChartsDir}/${folder}/Chart.yaml`, 'utf-8')
      const customValues = YAML.parse(v)
      const customChart = YAML.parse(c)
      const catalogItem = {
        name: folder,
        values: customValues,
        chartVersion: customChart.version,
        chartDescription: customChart.description,
      }
      catalog.push(catalogItem)
      helmCharts.push(folder)
    } catch (error) {
      console.error(`Error reading or parsing files for ${folder}: ${error.message}`)
    }
  }
  if (!catalog.length) throwChartError(`There are no charts in '${url}'`)
  // remove the related charts folder after 10 minutes
  const TIMEOUT = 5 * 60 * 1000
  const intervalId = setInterval(() => {
    shell.rm('-rf', helmChartsDir)
    console.log(`Removed ${helmChartsDir}`)
    clearInterval(intervalId)
  }, TIMEOUT)
  return { helmCharts, catalog }
}
