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

export async function getWorkloadChart(
  revision: string,
  giturl: string,
  path: string,
  workloadName: string,
  teamId: string,
  emailNoSymbols: string,
): Promise<Promise<any>> {
  let shellResult
  shellResult = shell.pwd()
  console.log('shellResult', shellResult)
  const helmChartsDir = `/tmp/otomi/charts/${emailNoSymbols}/${teamId}-${workloadName}`
  shell.rm('-rf', helmChartsDir)
  shell.mkdir('-p', helmChartsDir)
  // shell.cd(helmChartsDir)
  let url = giturl

  if (giturl.includes('gitea')) {
    const [, giteaUrl] = giturl.split('://')
    url = `https://${process.env.GIT_USER}:${process.env.GIT_PASSWORD}@${giteaUrl}`
  }

  if (revision !== 'HEAD') {
    const commitIDRegex = /^[0-9a-fA-F]{40}$/
    const isCommitID = commitIDRegex.test(revision)

    if (isCommitID) {
      shell.exec(`git clone ${url} helmChartsDir`)
      shellResult = shell.exec(`git reset --hard ${revision}`)
    } else shellResult = shell.exec(`git clone --depth 1 --branch ${revision} ${url} helmChartsDir`)

    if (shellResult.code !== 0)
      throwChartError(`Not found ${isCommitID ? 'commit' : 'branch or tag'} '${revision}' in '${giturl}'`)
  } else shell.exec(`git clone --depth 1 ${url} helmChartsDir`)

  shellResult = shell.pwd()
  console.log('shellResult', shellResult)

  try {
    const v = await readFile(`${helmChartsDir}${path}/values.yaml`, 'utf-8')
    const c = await readFile(`${helmChartsDir}${path}/Chart.yaml`, 'utf-8')
    const customValues = YAML.parse(v)
    const customChart = YAML.parse(c)
    return {
      values: customValues,
      chartVersion: customChart.version,
      chartDescription: customChart.description,
    }
  } catch (error) {
    throwChartError(`There is no chart in '${giturl}' ${path ? ` path '${path}'` : ''}`)
  }
}
