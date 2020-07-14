import dotEnv from 'dotenv'
import path from 'path'
import { ProductsApi, Configurations, HttpBasicAuth } from '@redkubes/harbor-client'

dotEnv.config({ path: path.resolve(__dirname, '.env'), debug: true })
const env = process.env

async function main() {
  const api = new ProductsApi(env.HARBOR_BASE_URL)
  const auth = new HttpBasicAuth()
  auth.username = env.HARBOR_USER
  auth.password = env.HARBOR_PASSWORD
  api.setDefaultAuthentication(auth)

  try {
    console.info(`Setting up harbor configuration`)

    const config: Configurations = {
      authMode: 'oidc_auth',
      oidcVerifyCert: false,
      oidcScope: 'openid',
      oidcName: 'Azure',
      oidcGroupsClaim: 'groups',
      oidcClientId: '9c63a03a-40f8-4636-852b-f90d4b1bbbd0',
      oidcEndpoint: 'https://login.microsoftonline.com/57a3f6ea-7e70-4260-acb4-e06ce452f695/v2.0',
    }
    const res = await api.configurationsPut(config)
    console.info(`Successfully configured harbor`)

    console.error(JSON.stringify(res))
  } catch (e) {
    console.error(JSON.stringify(e))
    process.exit(1)
  }
}

main()
