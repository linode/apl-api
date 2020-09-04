import yaml from 'js-yaml'
import { cleanEnv, str } from 'envalid'
import Ajv from 'ajv'
import { readFileSync } from 'fs'

function main() {
  const env = cleanEnv(
    process.env,
    {
      VALUES_BUNDLE_PATH: str({ desc: 'A values bundle rendered by helmfile' }),
      SCHEMA_PATH: str({ desc: 'A path to root.yaml file' }),
    },
    { strict: true },
  )

  console.log(`Loading values from: ${env.VALUES_BUNDLE_PATH}`)
  const values = yaml.safeLoadAll(readFileSync(env.VALUES_BUNDLE_PATH, 'utf-8'))

  console.log(`Loading schema from: ${env.SCHEMA_PATH}`)
  const rawSchema = readFileSync(env.SCHEMA_PATH, 'utf-8')
  const schema = JSON.parse(rawSchema)

  console.log('Validating values against schema')

  const ajv = new Ajv({allErrors: true}) // options can be passed, e.g. {allErrors: true}
  const valid = ajv.validate(schema, values[0])
  if (!valid) {
    console.log("Validation Error!")
    ajv.errorsText().split(",").forEach( error => {  
      console.log(error)   
    })
    process.exit(1)
  } else {
    console.log("Validation Success!")

  }
}

main()
