process.env.NODE_ENV = 'test'
import { config, use } from 'chai'
import { default as chaiAsPromised } from 'chai-as-promised'
import { stub } from 'sinon'
import { default as sinonChai } from 'sinon-chai'
import { loadSpec } from 'src/app'
import * as getValuesSchemaModule from './utils'

config.truncateThreshold = 0
use(chaiAsPromised)
use(sinonChai)

before(async () => {
  if (process.env.CI) {
    stub(console, 'log')
    stub(console, 'debug')
    stub(console, 'info')
    stub(console, 'warn')
  }
  stub(getValuesSchemaModule, 'getValuesSchema').resolves({})
  await loadSpec()
})
