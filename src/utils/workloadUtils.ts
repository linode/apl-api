import { readFile } from 'fs-extra'
import shell from 'shelljs'
import YAML from 'yaml'

function throwChartError(message: string) {
  const err = {
    code: 404,
    message,
  }
  throw err
}

export async function getWorkloadChart(revision: string, url: string, path: string): Promise<Promise<any>> {
  let shellResult
  const helmChartsDir = '/tmp/helmChartsDir'
  shell.rm('-rf', helmChartsDir)
  shell.mkdir('-p', helmChartsDir)
  shell.cd(helmChartsDir)

  if (revision !== 'HEAD') {
    const commitIDRegex = /^[0-9a-fA-F]{40}$/
    const isCommitID = commitIDRegex.test(revision)

    if (isCommitID) {
      shell.exec(`git clone ${url} .`)
      shellResult = shell.exec(`git reset --hard ${revision}`)
    } else shellResult = shell.exec(`git clone --depth 1 --branch ${revision} ${url} .`)

    if (shellResult.code !== 0)
      throwChartError(`Not found ${isCommitID ? 'commit' : 'branch or tag'} '${revision}' in '${url}'`)
  } else shell.exec(`git clone --depth 1 ${url} .`)

  try {
    const v = await readFile(`${helmChartsDir}${path}/values.yaml`, 'utf-8')
    const c = await readFile(`${helmChartsDir}${path}/Chart.yaml`, 'utf-8')
    const customValues = YAML.parse(v)
    const customChart = YAML.parse(c)
    return { customValues, chartVersion: customChart.version, chartDescription: customChart.description }
  } catch (error) {
    throwChartError(`There is no chart in '${url}' ${path ? ` path '${path}'` : ''}`)
  }
}
