import { expect } from 'chai'
import fs from 'fs'
import OpenAPISchemaValidator from 'openapi-schema-validator'
import path from 'path'
import yaml from 'js-yaml'

describe('Api spec validation', function () {
  it('should indicated that api spec is valid', function (done) {
    const openApiPath = path.resolve(__dirname, 'api.yaml')
    const apiDoc = fs.readFileSync(openApiPath, 'utf8')
    const spec = yaml.safeLoad(apiDoc)
    const validator = new OpenAPISchemaValidator({ version: 3 })
    const result = validator.validate(spec)
    expect(result.errors).to.be.empty
    done()
  })
  it('should indicated that api spec is invalid', function (done) {
    const validator = new OpenAPISchemaValidator({ version: 3 })
    const result = validator.validate({ garbage: 1 })
    expect(result.errors).to.be.not.empty
    done()
  })
})
