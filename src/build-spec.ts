import $RefParser from '@apidevtools/json-schema-ref-parser'
import Debug from 'debug'
import { writeFileSync } from 'fs'
import path from 'path'

const debug = Debug('otomi:build-spec')

const modelsPath = 'src/generated-schema.json'

async function buildOpenApisSpec(): Promise<void> {
  const openApiPath = path.resolve(__dirname, 'openapi/api.yaml')
  debug(`Loading api spec from: ${openApiPath}`)
  await $RefParser.dereference(openApiPath).then((schema) => {
    writeFileSync(modelsPath, JSON.stringify(schema, undefined, '  '), 'utf8')
  })
}

buildOpenApisSpec()
