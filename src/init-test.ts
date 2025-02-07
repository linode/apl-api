/* eslint-disable @typescript-eslint/no-empty-function */
process.env.NODE_ENV = 'test'
process.env.JEST_LOADSPEC = 'true'
import * as getValuesSchemaModule from './utils'

beforeAll(async () => {
  if (process.env.CI) {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'debug').mockImplementation(() => {})
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  }

  jest.spyOn(getValuesSchemaModule, 'getValuesSchema').mockResolvedValue({})

  if (process.env.JEST_LOADSPEC) {
    const { loadSpec } = await import('src/app') // Dynamic import
    await loadSpec()
  }
})
