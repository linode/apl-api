import $RefParser from '@apidevtools/json-schema-ref-parser'
import fs from 'fs'
import path from 'path'

const clientPath = 'vendors/openapi/otomi-api.json'
const modelsPath = 'src/generated-schema.json'

async function buildOpenApisSpec(): Promise<void> {
  const openApiPath = path.resolve(__dirname, 'openapi/api.yaml')
  console.log(`Loading api spec from: ${openApiPath}`)
  let schema = await $RefParser.dereference(openApiPath)
  fs.writeFileSync(modelsPath, JSON.stringify(schema, undefined, '  '), 'utf8')
  schema = await $RefParser.bundle(openApiPath)
  fs.writeFileSync(clientPath, JSON.stringify(schema, undefined, '  '), 'utf8')
}

buildOpenApisSpec()
