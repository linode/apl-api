import { expect } from 'chai'
import OpenAPISchemaValidator from 'openapi-schema-validator'
import { isValidAuthzSpec } from './authz'
import { OpenAPIDoc } from './otomi-models'
import { loadOpenApisSpec } from './otomi-stack'

describe('Api spec validation', () => {
  it('should indicate that api spec is valid', async () => {
    const spec: any = await loadOpenApisSpec()
    const validator = new OpenAPISchemaValidator({ version: 3 })
    const result = validator.validate(spec)
    expect(result.errors, JSON.stringify(result, undefined, '  ')).to.be.empty
  })
})

describe('Api spec authorization validation', () => {
  it('should indicate that api authz spec is valid', async () => {
    const spec: OpenAPIDoc = await loadOpenApisSpec()
    expect(isValidAuthzSpec(spec)).to.be.true
  })
})
