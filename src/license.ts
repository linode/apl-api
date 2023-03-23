import Debug from 'debug'
import { cleanEnv, str } from 'envalid'
import { readFile, writeFile } from 'fs-extra'
import jwt from 'jsonwebtoken'
import path from 'path'
import { parse as parseYaml } from 'yaml'
import { License } from './otomi-models'

export const defaultLicensePath = 'env/license.yaml'
export const defaultPublicKeyPath = path.resolve(__dirname, 'license/license.pem')

const d = Debug('otomi:license')

export async function cliSignLicense() {
  const env = cleanEnv(process.env, {
    SECRET_RSA_KEY_PATH: str({ desc: 'A private RSA key used for signing the license JWT' }),
    PUBLIC_RSA_KEY_PATH: str({ desc: 'A public RSA key used for veryfing the signed license' }),
    LICENSE_SRC_PATH: str({ desc: 'A license file in YAML format' }),
    LICENSE_DST_PATH: str({ desc: 'Destination path of the signed license' }),
  })

  d(`SECRET_RSA_KEY_PATH: ${env.SECRET_RSA_KEY_PATH}`)
  d(`PUBLIC_RSA_KEY_PATH: ${env.SECRET_RSA_KEY_PATH}`)
  d(`LICENSE_SRC_PATH: ${env.LICENSE_SRC_PATH}`)
  d(`LICENSE_DST_PATH: ${env.LICENSE_DST_PATH}`)

  const license = parseYaml(await readFile(env.LICENSE_SRC_PATH, 'utf8')) as License['body']
  const privateKey = await readFile(env.SECRET_RSA_KEY_PATH, 'utf8')
  const publicKey = await readFile(env.PUBLIC_RSA_KEY_PATH, 'utf8')
  const signedLicense = jwt.sign(license as object, privateKey, { algorithm: 'RS256' })
  d(`Signed license has been save in the ${env.LICENSE_DST_PATH} file`)

  d(`Veryfing signed license with public key`)
  jwt.verify(signedLicense, publicKey, { algorithms: ['RS256'] })
  d(`License has been succesfullly verified`)

  writeFile(env.LICENSE_DST_PATH, signedLicense)
}

cliSignLicense()
