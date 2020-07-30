/* eslint-disable @typescript-eslint/camelcase */
import { Issuer } from "openid-client";
import { ClientsApi, IdentityProvidersApi, ClientScopesApi, HttpError } from "@redkubes/keycloak-10.0-client";
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
  
  // Log options,clients, realms
  // console.log("Listing all Otomi Client Properties..");
  // for (const client of (await masterClient).body) {
  //   console.log(`id:  ${client.clientId}`);
  //   for (const prop in  client) {
  //     console.log(` ${prop}:  ${client[prop]}  `);
  //   }
  //   console.log(` \n\t `);
  // }

  if (errors.length) {
    console.log(JSON.stringify(errors, null, 2))
    process.exit(1)
  } else {
    console.log("Success!")
  }

}

main() 
