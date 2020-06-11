import { expect } from 'chai'
import OpenAPISchemaValidator from 'openapi-schema-validator'
import { loadOpenApisSpec } from './server'
import { isValidAuthzSpec } from './authz'

describe('Api spec validation', () => {
  it('should indicated that api spec is valid', async () => {
    const spec: any = await loadOpenApisSpec()
    const validator = new OpenAPISchemaValidator({ version: 3 })
    const result = validator.validate(spec)
    console.log(JSON.stringify(result, undefined, 2))
    expect(result.errors).to.be.empty
  })
})

describe('Api spec authorization validation', () => {
  it('should indicated that api authz spec is valid', async () => {
    const spec: any = await loadOpenApisSpec()
    expect(isValidAuthzSpec(spec)).to.be.true
  })
})
