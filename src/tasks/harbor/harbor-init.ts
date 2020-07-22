import { ProductsApi, Configurations, HttpBasicAuth } from '@redkubes/harbor-client'
import { bool, cleanEnv, str } from 'envalid'

async function main() {
  const env = cleanEnv(
    process.env,
    {
      HARBOR_BASE_URL: str({ desc: 'A harbor core service URL' }),
      HARBOR_USER: str({ desc: 'A name of harbor admin user' }),
      HARBOR_PASSWORD: str({ desc: 'A password of harbor admin user' }),
      OIDC_CLIENT_ID: str(),
      OIDC_CLIENT_SECRET: str(),
      OIDC_ENDPOINT: str(),
      OIDC_GROUPS_CLAIM: str(),
      OIDC_NAME: str(),
      OIDC_SCOPE: str(),
      OIDC_VERIFY_CERT: bool(),
    },
    { strict: true },
  )

  const api = new ProductsApi(env.HARBOR_BASE_URL)
  const auth = new HttpBasicAuth()
  auth.username = env.HARBOR_USER
  auth.password = env.HARBOR_PASSWORD
  api.setDefaultAuthentication(auth)

  try {
    console.info('Setting up harbor configuration')

    const config: Configurations = {
      authMode: 'oidc_auth',
      oidcClientId: env.OIDC_CLIENT_ID,
      oidcClientSecret: env.OIDC_CLIENT_SECRET,
      oidcEndpoint: env.OIDC_ENDPOINT,
      oidcGroupsClaim: env.OIDC_GROUPS_CLAIM,
      oidcName: env.OIDC_NAME,
      oidcScope: env.OIDC_SCOPE,
      oidcVerifyCert: env.OIDC_VERIFY_CERT,
    }
    await api.configurationsPut(config)
    console.info(`Successfully configured harbor`)
  } catch (e) {
    console.trace()
    console.error('Error:', e)
    process.exit(1)
  }
}

main()
