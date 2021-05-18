import $RefParser from '@apidevtools/json-schema-ref-parser'
import fs from 'fs'
import path from 'path'

const clientPath = 'vendors/openapi/otomi-api.json'
const modelsPath = 'src/generated-schema.json'

async function buildOpenApisSpec(): Promise<void> {
  const openApiPath = path.resolve(__dirname, 'openapi/api.yaml')
  console.log(`Loading api spec from: ${openApiPath}`)
  const schema = await $RefParser.dereference(openApiPath)
  console.log(`Generating: ${modelsPath}`)
  fs.writeFileSync(modelsPath, JSON.stringify(schema, undefined, '  '), 'utf8')

  console.log(`Generating: ${clientPath}`)
  const clientSchema = await $RefParser.bundle(openApiPath)
  fs.writeFileSync(clientPath, JSON.stringify(clientSchema, undefined, '  '), 'utf8')
  console.log(`Success`)
}

buildOpenApisSpec()
