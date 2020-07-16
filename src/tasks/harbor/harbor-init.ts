import { ProductsApi, Configurations, HttpBasicAuth } from '@redkubes/harbor-client'

const env = process.env

async function main() {
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
      oidcVerifyCert: env.OIDC_VERIFY_CERT == 'true',
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
