/* eslint-disable @typescript-eslint/ban-types */
import * as api from "@redkubes/keycloak-10.0-client"
import { cleanEnv, str, json } from "envalid"
import * as utils from "../../utils"
import {  cloneDeep, defaultsDeep, snakeCase } from "lodash"

import {
  roles,
  protocolMappers,
  teamIdpMappers, 
  defaultIdpMappers,
  adminIdpMappers,
  otomiClientConfig, 
  authenticationFlows,
  authenticatorConfig
} from "./config"

import {
  Role,
  ProtocolMappers,
  IdentityProviderMapper,
  AuthenticationFlow,
  Team
} from "./interfaces"

const env = cleanEnv(
  process.env,
  {
    CLOUD_TENANT: str({ desc: 'A Cloud Tenant ID' }),
    TENANT_CLIENT_ID: str({ desc: 'A Cloud Application ID' }),
    OIDC_SCOPE: str({ desc: 'A Keycloak Client Scope for OIDC Compatibility' }),
    IDP_ALIAS: str({ desc: 'A name for the Identity Provider Entry' }),
    KEYCLOAK_CLIENT_ID: str({ desc: 'A Keycloak client application ID ' }),
    KEYCLOAK_CLIENT_SECRET: str({ desc: 'A Keycloak Client Application Secret' }),
    KEYCLOAK_CLIENT_SCOPES: json({ desc: 'A list of role names in JSON format' }),
    KEYCLOAK_REALM: str({ desc: 'Default Keycloak Realm' }),
    REDIRECT_URIS: json({ desc: 'A list of Redirect URI\'s in JSON format' }),
    IDP_GROUP_OTOMI_ADMIN: str({ desc: 'Otomi Admin IDP Group ID' }),
    IDP_GROUP_TEAMS: json({ desc: 'A list of Team Names and Group Id\'s from the IDP' }),
  },
  { strict: true },
)

export function createClient(id: string = env.KEYCLOAK_CLIENT_ID,
    defaultClientScopes: Array<string> = env.KEYCLOAK_CLIENT_SCOPES,
    redirectUris: Array<string> = env.REDIRECT_URIS,
    secret: string = env.KEYCLOAK_CLIENT_SECRET): api.ClientRepresentation {
  return defaultsDeep(new api.ClientRepresentation(), {
    id: id,
    secret: secret,
    standardFlowEnabled: true,
    defaultClientScopes: defaultClientScopes,
    implicitFlowEnabled: true,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: true,
    authorizationServicesEnabled: true,
    attributes: utils.objectToConfigMap(otomiClientConfig.attributes),
    redirectUris: redirectUris,
    // @todo match correct types
    // authenticationFlowBindingOverrides: utils.objectToConfigMap(otomiClientConfig.authenticationFlowBindingOverrides)
  })
}

export function createIdpMappers(idpAlias: string = env.IDP_ALIAS,
  teams: object = env.IDP_GROUP_TEAMS,
  adminGid: string = env.IDP_GROUP_OTOMI_ADMIN
): Array<api.IdentityProviderMapperRepresentation> {
  // admin idp mapper case
  const adminmaps = adminIdpMappers.map((idpMapper) => { 
    return defaultsDeep({
      identityProviderAlias: idpAlias,
      config: {
        "claim.value": adminGid
      }
    },
    idpMapper as IdentityProviderMapper, 
    )
  })
  // default idp mappers case
  const defaultmaps = defaultIdpMappers.map((idpMapper) => {
    return defaultsDeep(idpMapper as IdentityProviderMapper, {
      identityProviderAlias: idpAlias
    })
  })
  // team idp generated from IDP_GROUP_TEAMS env 
  const mockMapper = cloneDeep(teamIdpMappers[0])
  const _teams = utils.objectToArray(teams, "name", "gid") as Team[] 
  // iterate through all the teams and patch mapper object 
  const teammaps = _teams.map((team) => {
    return defaultsDeep({
      identityProviderAlias: idpAlias,
      name: `map_${snakeCase(team.name)}_group_to_role`,
      config: {
        "claim.value": team.gid
      }
    },
    mockMapper as IdentityProviderMapper,
    )
  })
  return teammaps.concat(defaultmaps).concat(adminmaps)
}

export function createIdProvider(tenantId: string = env.CLOUD_TENANT,
    clientId: string = env.TENANT_CLIENT_ID,
    alias: string = env.IDP_ALIAS,
    secret: string = env.KEYCLOAK_CLIENT_SECRET): api.IdentityProviderRepresentation {  
  return defaultsDeep( new api.IdentityProviderRepresentation(), {
    alias: alias,
    displayName: alias,
    providerId: "oidc",
    enabled: true,
    trustEmail: true,
    firstBrokerLoginFlowAlias: "first broker login",
    config: utils.objectToConfigMap({
      userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
      validateSignature: "true",
      clientId: clientId,
      tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      jwksUrl: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      useJwksUrl: `true`,
      authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      clientAuthMethod: `client_secret_post`,
      logoutUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`,
      syncMode: "FORCE",
      clientSecret: secret, 
      defaultScope: "openid email profile"
    })
  })
}

export function createClientScopes(scope: string = env.OIDC_SCOPE) : api.ClientScopeRepresentation {
  return defaultsDeep(new api.ClientScopeRepresentation(), {
    name: scope,
    protocol: "openid-connect",
    attributes: utils.objectToConfigMap({
      "include.in.token.scope": "true",
      "display.on.consent.screen": "true"
    }),
    protocolMappers: this.createProtocolMappersForClientScope(),
  })
}

export function createProtocolMappersForClientScope(): Array<api.ProtocolMapperRepresentation> {
  return protocolMappers.map((proto) => { 
    const m: api.ProtocolMapperRepresentation = proto as ProtocolMappers
    return m
  })
}

export function createRoles(teams: object = env.IDP_GROUP_TEAMS,
    realm: string = env.KEYCLOAK_REALM): Array<api.RoleRepresentation> {
  const mockRole = cloneDeep(roles[0])
  // iterate through all the teams and patch role object 
  const _teams = utils.objectToArray(teams, "name", "gid") as Team[] 
  return _teams.map((team) => {
    return defaultsDeep({
      name: team.name,
      description: mockRole.description + team.gid,
      containerId: realm
    },
    mockRole as Role,
    )
  })
}

export function createAuthenticationFlows(): api.AuthenticationFlowRepresentation {
  const flow: api.AuthenticationFlowRepresentation = authenticationFlows[0] as AuthenticationFlow
  return flow
}

export function createAuthConfigs(): Array<api.AuthenticatorConfigRepresentation> {
  return authenticatorConfig.map((authConfig) => {
    return defaultsDeep(new api.AuthenticatorConfigRepresentation(), {
      alias:   authConfig.alias,
      config:   utils.objectToConfigMap(authConfig.config)
    })
  })
}
