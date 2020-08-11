/* eslint-disable @typescript-eslint/camelcase */
import { Issuer } from "openid-client"
import { ClientsApi, IdentityProvidersApi, ClientScopesApi, RolesApi, AuthenticationManagementApi, HttpError } from "@redkubes/keycloak-10.0-client"
import  * as realmConfig   from "./realm-factory"
import { cleanEnv, str, json } from "envalid"

const errors = []
async function main() {

  const env = cleanEnv(
    process.env,
    {
      IDP_ALIAS: str({ desc: 'A name for the Identity Provider Entry' }),
      KEYCLOAK_ADMIN: str({ desc: 'Default Admin User for KeyCloak Server' }),
      KEYCLOAK_ADMIN_PASSWORD: str({ desc: 'Default Password for Admins' }),
      KEYCLOAK_ADDRESS: str({ desc: 'Default Keycloak Server Address' }),
      KEYCLOAK_REALM: str({ desc: 'Default Keycloak Realm' }),
  },
    { strict: true },
  )

  // keycloak oapi client connection options
  const keycloakAddress = env.KEYCLOAK_ADDRESS
  const basePath = `${keycloakAddress}/admin/realms`
  const keycloakIssuer = await Issuer.discover(
    `${keycloakAddress}/realms/${env.KEYCLOAK_REALM}/`
  )
  const openIdConnectClient = new keycloakIssuer.Client({
    client_id: "admin-cli",
    client_secret: "unused",
  })
  const token = await openIdConnectClient.grant({
    grant_type: "password",
    username: env.KEYCLOAK_ADMIN,
    password: env.KEYCLOAK_ADMIN_PASSWORD
  })
  
  // Create Otomi Client
  try {
    const clients = new ClientsApi(basePath)
    clients.accessToken = String(token.access_token)
    await clients.realmClientsPost(env.KEYCLOAK_REALM,
      realmConfig.createClient()
    )
    console.log("Loaded Keycloak Client Application")
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`Client already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading Client: ${e}`)
  }

  // Create Identity Provider
  try {
    const providers = new IdentityProvidersApi(basePath)
    providers.accessToken = String(token.access_token)
    await providers.realmIdentityProviderInstancesPost(env.KEYCLOAK_REALM,
      realmConfig.createIdProvider()
    )
    console.log(`Loaded IDP provider settings`)
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`IdentityProvider already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading IdentityProvider: ${e}`)
  }

  // Create Identity Provider Mappers
  try {
    const providers = new IdentityProvidersApi(basePath)
    providers.accessToken = String(token.access_token)
    
    for await (const idpMapper of realmConfig.createIdpMappers()) {
      try {
        console.log(` Loading config for mapper  ${env.KEYCLOAK_REALM}, ${env.IDP_ALIAS}, [${idpMapper.name}] `)
        await providers.realmIdentityProviderInstancesAliasMappersPost(env.KEYCLOAK_REALM, env.IDP_ALIAS, idpMapper)
      } catch (e) {
        if (e instanceof HttpError) {
          if (e.statusCode === 409) console.info(`IdPMapper [${idpMapper.name}] already exists. Skipping.`)
        } else {
          console.debug(`Caught Exception Uploading IdpMapper: ${e}`)
        }
      } finally {
        console.log(`Loaded [${idpMapper.name}] IdpMapper settings`)
      }
    }
    console.log(`Loaded IDP provider Mappers settings`)
  
  
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`IdentityProviderMappings already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading IdentityProvider: ${e}`)
  }
  
  // Create Client Scopes
  try {
    const clientScope = new ClientScopesApi(basePath)
    clientScope.accessToken = String(token.access_token)
    await clientScope.realmClientScopesPost(env.KEYCLOAK_REALM,
      realmConfig.createClientScopes()
    )
    console.log(`Loaded ClientScope settings`)
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`ClientScope already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading ClientScope: ${e}`)
  }
  
  // Create Roles
  try {
    const roles = new RolesApi(basePath)
    roles.accessToken = String(token.access_token)
    for await (const role of realmConfig.createRoles()) {
      try {
        await roles.realmRolesPost(env.KEYCLOAK_REALM, role)
      } catch (e) {
        if (e instanceof HttpError) {
          if (e.statusCode === 409) console.info(`Role [${role.name}] already exists. Skipping.`)
        } else {
          console.debug(`Caught Exception Uploading Role: ${e}`)
        }
      } finally {
        console.log(`Loaded ${role.name} Role settings`)
      }
    }
    console.log(`Finished loading Roles settings`)
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`Role already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading Roles: ${e}`)
  }
  

// ----------------------------------------------------
  // WIP
  // Create authn flows
  try {
    const authn = new AuthenticationManagementApi(basePath)
    authn.accessToken = String(token.access_token)
    for await (const authnc of realmConfig.createAuthConfigs()) {
    //  console.log(authnc)
    }
    for await (const authnflows of [realmConfig.createAuthenticationFlows()]) {
    //  console.log(authnflows)
    }
    
    const execs = await authn.realmAuthenticationFlowsFlowAliasExecutionsGet("master", "browser")
    execs.body.array.forEach((execution) => {
      if (execution.configurable === true) {
        console.log(
         execution
        )
        const id = execution.id
        const providerId = execution.providerId
      }
    })
// ----------------------------------------------------
    
    
    console.log(`Finished loading Authentication settings`)
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`Authentication already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading Authentication: ${e}`)
  }
  
  if (errors.length) {
    console.log(JSON.stringify(errors, null, 2))
    process.exit(1)
  } else {
    console.log("Success!")
  }

}

main() 
