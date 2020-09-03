import path from 'path'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import fs from 'fs'
import { cleanEnv, str } from 'envalid'
import * as _ from 'lodash'

const env = cleanEnv(
  process.env,
  {
    INPUT_FILE_PATH: str({ desc: 'An input file to a schema (root.yaml)' }),
    OUTPUT_FILE_PATH: str({ desc: 'An output file path for compiled schema' }),
    OUTPUT_LITE_FILE_PATH: str({ desc: 'An output file path for lite schema' }),
  },
  { strict: true },
)

// strips the required property from object structure recursively
function stripRequiredFromObject(o) {
  if (o.required) o.required = []
  if (o.properties) {
    _.keys(o.properties).forEach( prop => {
      o.properties[prop].required = []
      stripRequiredFromObject(o.properties[prop])
    })
  }
  return o
}

async function main() {
  const openApiPath = path.resolve(env.INPUT_FILE_PATH)
  console.log(`Loading api spec from: ${openApiPath}`)
  const schema = await $RefParser.bundle(openApiPath)
  const liteSchema = stripRequiredFromObject(_.cloneDeep(schema))
  // output file for default schema 
  fs.writeFileSync(env.OUTPUT_FILE_PATH, JSON.stringify(schema, null, '  '), 'utf8')
  // output file for lite schema (used for vscode autocomplete)
  fs.writeFileSync(env.OUTPUT_LITE_FILE_PATH, JSON.stringify(liteSchema, null, '  '), 'utf8')
  return schema
}

main()
