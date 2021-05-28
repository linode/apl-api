import $RefParser from '@apidevtools/json-schema-ref-parser'
import fs from 'fs'
import path from 'path'

const clientPath = 'vendors/openapi/otomi-api.json'
const modelsPath = 'src/generated-schema.json'

async function buildOpenApisSpec(): Promise<void> {
  const openApiPath = path.resolve(__dirname, 'openapi/api.yaml')
  console.log(`Loading api spec from: ${openApiPath}`)
  await $RefParser.dereference(openApiPath).then((schema) => {
    fs.writeFileSync(modelsPath, JSON.stringify(schema, undefined, '  '), 'utf8')
  })
  await $RefParser.bundle(openApiPath).then((schema) => {
    fs.writeFileSync(clientPath, JSON.stringify(schema, undefined, '  '), 'utf8')
  })
}

buildOpenApisSpec()
