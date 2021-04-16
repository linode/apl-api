import $RefParser from '@apidevtools/json-schema-ref-parser'
import fs from 'fs'
import path from 'path'

const targetFilePath = process.argv.slice(2)[0]

async function buildOpenApisSpec(): Promise<void> {
  const openApiPath = path.resolve(__dirname, 'openapi.yaml')
  console.log(`Loading api spec from: ${openApiPath}`)
  const schema = await $RefParser.bundle(openApiPath)
  fs.writeFileSync(targetFilePath, JSON.stringify(schema, undefined, '  '), 'utf8')
}

buildOpenApisSpec()
