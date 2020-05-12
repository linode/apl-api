import { expect } from 'chai'
import fs from 'fs'
import OpenAPISchemaValidator from 'openapi-schema-validator'
import path from 'path'
import yaml from 'js-yaml'
import { isValidAuthzSpec } from './authz'

describe('Api spec validation', () => {
  it('should indicated that api spec is valid', (done) => {
    const openApiPath = path.resolve(__dirname, 'api.yaml')
    const apiDoc = fs.readFileSync(openApiPath, 'utf8')
    const spec = yaml.safeLoad(apiDoc)
    const validator = new OpenAPISchemaValidator({ version: 3 })
    const result = validator.validate(spec)
    expect(result.errors).to.be.empty
    done()
  })
})

describe('Api spec authorization validation', () => {
  it('should indicated that api authz spec is valid', (done) => {
    const openApiPath = path.resolve(__dirname, 'api.yaml')
    const apiDoc = fs.readFileSync(openApiPath, 'utf8')
    const spec = yaml.safeLoad(apiDoc)

    expect(isValidAuthzSpec(spec)).to.be.true
    done()
  })
})
