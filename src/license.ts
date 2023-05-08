import Ajv from 'ajv'
import Debug from 'debug'
import { cleanEnv, str } from 'envalid'
import { readFile, writeFile } from 'fs-extra'
import jwt from 'jsonwebtoken'
import path from 'path'
import { parse as parseYaml } from 'yaml'
import schema from '../src/generated-schema.json'
import { License } from './otomi-models'

export const defaultLicensePath = 'env/license.yaml'
export const defaultPublicKeyPath = path.resolve(__dirname, 'license/license.pem')

const d = Debug('otomi:license')
const errors: string[] = []

function errorMessageBuilder(message: string) {
  let errorMessage: string
  // eslint-disable-next-line chai-friendly/no-unused-expressions
  errors.length > 0 ? (errorMessage = ` ${message}`) : (errorMessage = `${message}`)
  errors.push(errorMessage)
}

// check the license for any extra properties, missing properties, wrong values and capabilities
function checkLicenseToSign(license: License): boolean {
  let isValid = true

  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema.components.schemas.License.properties.body)
  const bodyProps = Object.keys(schema.components.schemas.License.properties.body.properties)
  const capabilitiesProps = Object.keys(
    schema.components.schemas.License.properties.body.properties.capabilities.properties,
  )
  const extraPropsBody = Object.keys(license.body!).filter((key) => !bodyProps.includes(key))
  const extraPropsCapabilities = Object.keys(license.body!.capabilities).filter(
    (key) => !capabilitiesProps.includes(key),
  )

  if (extraPropsBody.length > 0) {
    isValid = false
    errors.push(`Unwanted Body Props: ${extraPropsBody}`)
  }
  if (extraPropsCapabilities.length > 0) {
    isValid = false
    errorMessageBuilder(`Unwanted Capabilities Props: ${extraPropsCapabilities}`)
  }
  if (!validate(license.body)) {
    isValid = false
    errorMessageBuilder(ajv.errorsText(validate.errors))
  }
  // Check for correct capabilities per License type
  if (license.body?.type === 'community') {
    if (license.body.capabilities.services > 10) {
      isValid = false
      errorMessageBuilder('Service capabilities are too high for this type of license')
    }
    if (license.body.capabilities.teams > 2) {
      isValid = false
      errorMessageBuilder('Teams capabilities are too high for this type of license')
    }
    if (license.body.capabilities.workloads > 10) {
      isValid = false
      errorMessageBuilder('Workloads capabilities are too high for this type of license')
    }
  }
  if (license.body?.type === 'professional') {
    isValid = false
    errorMessageBuilder('This type of license is not supported yet, please choose either community or enterprise')
  }

  if (!isValid) throw new Error(`${errors}`)
  return isValid
}

export async function cliSignLicense() {
  const env = cleanEnv(process.env, {
    RSA_PRIVATE_KEY: str({ desc: 'A private RSA key used for signing the license JWT' }),
    RSA_PUBLIC_KEY: str({ desc: 'A public RSA key used for veryfing the signed license' }),
    LICENSE_SRC_PATH: str({ desc: 'A license file in YAML format' }),
    LICENSE_DST_PATH: str({ desc: 'Destination path of the signed license' }),
  })

  d(`LICENSE_SRC_PATH: ${env.LICENSE_SRC_PATH}`)
  d(`LICENSE_DST_PATH: ${env.LICENSE_DST_PATH}`)

  const license: License = parseYaml(await readFile(env.LICENSE_SRC_PATH, 'utf8')) as License

  if (checkLicenseToSign(license)) {
    const privateKey = env.RSA_PRIVATE_KEY
    const publicKey = env.RSA_PUBLIC_KEY
    const signedLicense = jwt.sign(license as object, privateKey, { algorithm: 'RS256' })
    d(`Signed license has been saved in the ${env.LICENSE_DST_PATH} file`)

    d(`Veryfing signed license with public key`)
    jwt.verify(signedLicense, publicKey, { algorithms: ['RS256'] })
    d(`License has been succesfullly verified`)

    writeFile(env.LICENSE_DST_PATH, signedLicense)
  }
}

// TODO: Is this the best place for this???
cliSignLicense()
