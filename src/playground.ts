#!/usr/bin/env node --nolazy -r ts-node/register -r tsconfig-paths/register

import { loadValues } from './repo'
import { Repo } from './otomi-models'

async function play() {
  // Suppose your environment directory is "my-environment"
  const envDir = '/private/tmp/otomi-bootstrap-dev'

  const allSpecs = await loadValues(envDir)

  const repo = allSpecs as Repo
  console.log(allSpecs)
  console.log(repo)
}

play()
