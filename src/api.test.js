const expect = require('chai').expect
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const OpenAPISchemaValidator = require('openapi-schema-validator').default

describe('Api spec validation', function () {
  it('should indicated that api spec is valid', function (done) {
    const openApiPath = path.resolve(__dirname, 'api.yaml')
    const apiDoc = fs.readFileSync(openApiPath, 'utf8')
    let spec = yaml.safeLoad(apiDoc)
    var validator = new OpenAPISchemaValidator({ version: 3 })
    const result = validator.validate(spec)
    expect(result.errors).to.be.empty
    done()
  })
  it('should indicated that api spec is invalid', function (done) {
    var validator = new OpenAPISchemaValidator({ version: 3 })
    const result = validator.validate({ garbage: 1 })
    expect(result.errors).to.be.not.empty
    done()
  })
})
