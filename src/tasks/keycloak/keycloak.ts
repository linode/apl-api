/* eslint-disable @typescript-eslint/camelcase */
import { Issuer } from "openid-client";
import { ClientsApi, IdentityProvidersApi, ClientScopesApi, RolesApi, HttpError } from "@redkubes/keycloak-10.0-client";
import { KeycloakRealmSettingsGenerator }  from "./KeycloakRealmSettingsGenerator";
import { cleanEnv, str } from 'envalid'


const errors = [];
async function main() {

  const env = cleanEnv(
    process.env,
    {
      IDP_ALIAS: str({ desc: 'A name for the Identity Provider Entry' }),
      KEYCLOAK_ADMIN: str({ desc: 'Default Admin User for KeyCloak Server' }),
      KEYCLOAK_ADMIN_PASSWORD: str({ desc: 'Default Password for Admins' }),
      KEYCLOAK_ADDRESS: str({ desc: 'Default Keycloak Server Address' }),
      KEYCLOAK_CLIENT_ID: str({ desc: 'A Keycloak client application ID ' }),
      KEYCLOAK_REALM: str({ desc: 'Default Keycloak Realm' }),
    },
    { strict: true },
  )

  // keycloak oapi client connection options
  const keycloakAddress = env.KEYCLOAK_ADDRESS;
  const basePath = `${keycloakAddress}/admin/realms`;
  const keycloakIssuer = await Issuer.discover(
    `${keycloakAddress}/realms/${env.KEYCLOAK_REALM}/`
  );
  const openIdConnectClient = new keycloakIssuer.Client({
    client_id: "admin-cli",
    client_secret: "unused",
  });
  const token = await openIdConnectClient.grant({
    grant_type: "password",
    username: env.KEYCLOAK_ADMIN,
    password: env.KEYCLOAK_ADMIN_PASSWORD
  });
  
  // Create Otomi Client
  try {
    const clients = new ClientsApi(basePath);
    clients.accessToken = String(token.access_token);
    // const masterClient = clients.realmClientsGet("master", "otomi");
    const clientResults = await clients.realmClientsPost(env.KEYCLOAK_REALM,
      KeycloakRealmSettingsGenerator.generateClient(env.KEYCLOAK_CLIENT_ID)
    );
    console.log("Loaded Keycloak Client Application");
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`Client already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading Client: ${e}`);
  }

  // Create Identity Provider
  try {
    const providers = new IdentityProvidersApi(basePath);
    providers.accessToken = String(token.access_token);
    const providerResults = await providers.realmIdentityProviderInstancesPost(env.KEYCLOAK_REALM,
      KeycloakRealmSettingsGenerator.generateIdProvider(env.IDP_ALIAS)
    );
    console.log(`Loaded IDP provider settings`);
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`IdentityProvider already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading IdentityProvider: ${e}`);
  }

  // Create Identity Provider Mappers
  try {
    const providers = new IdentityProvidersApi(basePath);
    providers.accessToken = String(token.access_token);
    
    for await (const idpMapper of KeycloakRealmSettingsGenerator.generateIdpMappers()) {
      try {
        console.log(` Loading config for mapper  ${env.KEYCLOAK_REALM}, ${env.IDP_ALIAS}, [${idpMapper.name}] `)
        const result = await providers.realmIdentityProviderInstancesAliasMappersPost(env.KEYCLOAK_REALM, /*env.IDP_ALIAS*/ 'redkubes-azure-devtest', idpMapper)
      } catch (e) {
        if (e instanceof HttpError) {
          if (e.statusCode === 409) console.info(`IdPMapper [${idpMapper.name}] already exists. Skipping.`)
        } else {
          console.debug(`Caught Exception Uploading IdpMapper: ${e}`)
        }
      } finally {
        console.log(`Loaded [${idpMapper.name}] IdpMapper settings`);
      }
    }
    console.log(`Loaded IDP provider Mappers settings`);
  
  
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`IdentityProviderMappings already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading IdentityProvider: ${e}`);
  }
  

  // Create Client Scopes
  try {
    const clientScope = new ClientScopesApi(basePath);
    clientScope.accessToken = String(token.access_token);
    const clientScopeResults = await clientScope.realmClientScopesPost(env.KEYCLOAK_REALM,
      KeycloakRealmSettingsGenerator.generateClientScopes()
    );
    console.log(`Loaded ClientScope settings`);
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`ClientScope already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading ClientScope: ${e}`);
  }
  
  
  // Create Roles
  try {
    const rolesScope = new RolesApi(basePath);
    rolesScope.accessToken = String(token.access_token);
    for await (const role of KeycloakRealmSettingsGenerator.generateRoles()) {
      try {
        await rolesScope.realmRolesPost(env.KEYCLOAK_REALM, role);
      } catch (e) {
        if (e instanceof HttpError) {
          if (e.statusCode === 409) console.info(`Role [${role.name}] already exists. Skipping.`)
        } else {
          console.debug(`Caught Exception Uploading Role: ${e}`)
        }
      } finally {
        console.log(`Loaded ${role.name} Role settings`);
      }
    }
    console.log(`Finished loading Roles settings`);
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.statusCode === 409) console.info(`Role already exists. Skipping.`)
    } else errors.push(`Caught Exception Uploading Roles: ${e}`);
  }
  
  if (errors.length) {
    console.log(JSON.stringify(errors, null, 2))
    process.exit(1)
  } else {
    console.log("Success!")
  }

}

main() 
