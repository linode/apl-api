/* eslint-disable @typescript-eslint/camelcase */
import { Issuer } from 'openid-client'
import { ClientsApi, IdentityProvidersApi, ClientScopesApi, RolesApi, HttpError } from '@redkubes/keycloak-client-node'
import * as realmConfig from './realm-factory'
import {
  cleanEnv,
  IDP_ALIAS,
  KEYCLOAK_ADMIN,
  KEYCLOAK_ADMIN_PASSWORD,
  KEYCLOAK_ADDRESS,
  KEYCLOAK_REALM,
} from '../../validators'

const errors = []

async function main() {
  const env = cleanEnv(
    process.env,
    {
      IDP_ALIAS,
      KEYCLOAK_ADMIN,
      KEYCLOAK_ADMIN_PASSWORD,
      KEYCLOAK_ADDRESS,
      KEYCLOAK_REALM,
    },
    { strict: process.env.NODE_NAME !== 'test' },
  )
  let basePath, token
  try {
    // keycloak oapi client connection options
    const keycloakAddress = env.KEYCLOAK_ADDRESS
    const keycloakRealm = env.KEYCLOAK_REALM
    basePath = `${keycloakAddress}/admin/realms`
    const keycloakIssuer = await Issuer.discover(`${keycloakAddress}/realms/${keycloakRealm}/`)
    const openIdConnectClient = new keycloakIssuer.Client({
      client_id: 'admin-cli',
      client_secret: 'unused',
    })
    token = await openIdConnectClient.grant({
      grant_type: 'password',
      username: env.KEYCLOAK_ADMIN,
      password: env.KEYCLOAK_ADMIN_PASSWORD,
    })
  } catch (error) {
    console.error(error)
    process.exit()
  }

  // Configure AccessToken for service calls
  const providers = new IdentityProvidersApi(basePath)
  providers.accessToken = String(token.access_token)
  const clientScope = new ClientScopesApi(basePath)
  clientScope.accessToken = String(token.access_token)
  const roles = new RolesApi(basePath)
  roles.accessToken = String(token.access_token)
  const clients = new ClientsApi(basePath)
  clients.accessToken = String(token.access_token)

  // Abstraction for async idempotent task
  async function runIdempotentTask(resource: string, fn: () => Promise<void>) {
    try {
      await fn()
      console.log(`Loaded ${resource} settings`)
    } catch (e) {
      if (e instanceof HttpError) {
        if (e.statusCode === 409) console.info(`${resource} already exists. Skipping.`)
      } else errors.push(`Caught Exception Creating ${resource}: ${e}`)
    }
  }

  // Create Client Scopes
  await runIdempotentTask('OpenID Client Scope', async () => {
    await clientScope.realmClientScopesPost(env.KEYCLOAK_REALM, realmConfig.createClientScopes())
  })

  // Create Roles
  for await (const role of realmConfig.mapTeamsToRoles()) {
    await runIdempotentTask(`${role.name} Role`, async () => {
      await roles.realmRolesPost(env.KEYCLOAK_REALM, role)
    })
  }

  // Create Identity Provider
  await runIdempotentTask('Identity Provider', async () => {
    await providers.realmIdentityProviderInstancesPost(env.KEYCLOAK_REALM, await realmConfig.createIdProvider())
  })

  // Create Identity Provider Mappers
  for await (const idpMapper of realmConfig.createIdpMappers()) {
    await runIdempotentTask(`${idpMapper.name} Mapping`, async () => {
      await providers.realmIdentityProviderInstancesAliasMappersPost(env.KEYCLOAK_REALM, env.IDP_ALIAS, idpMapper)
    })
  }

  // Create Otomi Client
  await runIdempotentTask('Otomi Client', async () => {
    await clients.realmClientsPost(env.KEYCLOAK_REALM, realmConfig.createClient())
  })

  if (errors.length) {
    console.log(JSON.stringify(errors, null, 2))
    process.exit(1)
  } else {
    console.log('Success!')
  }
}

main()
