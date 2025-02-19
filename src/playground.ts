#!/usr/bin/env node --nolazy -r ts-node/register -r tsconfig-paths/register

import { getFileMaps, getFilePath, loadValues } from './repo'
import { Repo } from './otomi-models'

async function play() {
  // Suppose your environment directory is "my-environment"
  const envDir = '/private/tmp/otomi-bootstrap-dev'

  const allSpecs = await loadValues(envDir)

  const repo = allSpecs as Repo

  const build = repo.teamConfig['demo'].builds[0]
  const jsonPath = ['$', 'teamConfig', 'demo']
  const filePath = getFilePath(
    getFileMaps(envDir).find((filemap) => filemap.kind === 'AplTeamBuild')!,
    jsonPath,
    build,
    '',
  )
  console.log(allSpecs)
  console.log(filePath)
}

play()
