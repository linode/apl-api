import { expect } from 'chai'
import OpenAPISchemaValidator from 'openapi-schema-validator'
import { getSpec } from 'src/app'
import { isValidAuthzSpec } from 'src/authz'

describe('Api spec validation', () => {
  it('should indicate that api spec is valid', () => {
    const validator = new OpenAPISchemaValidator({ version: 3 })
    const { spec } = getSpec()
    const result = validator.validate(spec as any)
    expect(result.errors, JSON.stringify(result, undefined, '  ')).to.be.empty
  })
})

describe('Api spec authorization validation', () => {
  it('should indicate that api authz spec is valid', () => {
    const { spec } = getSpec()
    expect(isValidAuthzSpec(spec)).to.be.true
  })
})
