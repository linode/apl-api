import path from 'path'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import fs from 'fs'
import { cleanEnv, str } from 'envalid'

const env = cleanEnv(
  process.env,
  {
    INPUT_FILE_PATH: str({ desc: 'An input file to a schema (root.yaml)' }),
    OUTPUT_FILE_PATH: str({ desc: 'An output file path for compiled schema' }),
  },
  { strict: true },
)

async function main() {
  const openApiPath = path.resolve(env.INPUT_FILE_PATH)
  console.log(`Loading api spec from: ${openApiPath}`)
  const schema = await $RefParser.bundle(openApiPath)
  fs.writeFileSync(env.OUTPUT_FILE_PATH, JSON.stringify(schema, null, '  '), 'utf8')
  return schema
}

main()
