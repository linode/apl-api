import { config, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { stub } from 'sinon'
import sinonChai from 'sinon-chai'

config.truncateThreshold = 0
use(chaiAsPromised)
use(sinonChai)

before(() => {
  stub(console, 'log')
  stub(console, 'debug')
  stub(console, 'info')
  stub(console, 'warn')
})
