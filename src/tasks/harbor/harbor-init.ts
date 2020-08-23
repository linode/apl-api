import { ProductsApi, Configurations, HttpBasicAuth } from '@redkubes/harbor-client'
import { bool, cleanEnv, str } from 'envalid'

async function main() {
  const env = cleanEnv(
    process.env,
    {
      HARBOR_BASE_URL: str({ desc: 'The harbor core service URL' }),
      HARBOR_USER: str({ desc: 'The harbor admin username' }),
      HARBOR_PASSWORD: str({ desc: 'The harbor admin password' }),
      OIDC_CLIENT_SECRET: str(),
      OIDC_ENDPOINT: str(),
      OIDC_VERIFY_CERT: bool(),
    },
    { strict: process.env.NODE_ENV !== 'test' },
  )

  const api = new ProductsApi(env.HARBOR_BASE_URL)
  const auth = new HttpBasicAuth()
  auth.username = env.HARBOR_USER
  auth.password = env.HARBOR_PASSWORD
  api.setDefaultAuthentication(auth)

  console.info('Configuring harbor')
  try {
    const config: Configurations = {
      authMode: 'oidc_auth',
      oidcClientId: 'otomi',
      oidcClientSecret: env.OIDC_CLIENT_SECRET,
      oidcEndpoint: env.OIDC_ENDPOINT,
      oidcGroupsClaim: 'groups',
      oidcName: 'otomi',
      oidcScope: 'openid',
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
