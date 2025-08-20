import * as getValuesSchemaModule from './utils'
import OpenAPISchemaValidator from 'openapi-schema-validator'
import { getSpec } from 'src/app'
import { isValidAuthzSpec } from 'src/authz'
beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'debug').mockImplementation(() => {})
  jest.spyOn(console, 'info').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})

  jest.spyOn(getValuesSchemaModule, 'getValuesSchema').mockResolvedValue({})

  const { loadSpec } = await import('src/app') // Dynamic import
  await loadSpec()
})

describe('Api spec validation', () => {
  it('should indicate that api spec is valid', () => {
    const validator = new OpenAPISchemaValidator({ version: 3 })
    const { spec } = getSpec()
    const result = validator.validate(spec as any)
    expect(result.errors).toEqual([]) // Expect no errors.
  })
})

describe('Api spec authorization validation', () => {
  it('should indicate that api authz spec is valid', () => {
    const { spec } = getSpec()
    expect(isValidAuthzSpec(spec)).toBe(true)
  })
})
