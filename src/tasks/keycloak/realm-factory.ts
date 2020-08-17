/* eslint-disable @typescript-eslint/ban-types */
import * as api from "@redkubes/keycloak-client-node"
import { cleanEnv, str, json } from "envalid"
import * as utils from "../../utils"
import {  defaultsDeep } from "lodash"

import {
  roleTpl,
  idpMapperTpl, 
  defaultsIdpMapperTpl,
  protocolMappersList,
  idpProviderCfgTpl,
  clientScopeCfgTpl,
  otomiClientCfgTpl,
  OidcProvider,
} from "./config"

//type definition for imported ENV variable IDP_GROUP_MAPPINGS_TEAMS
export interface TeamMapping {
  name: string;
  groupMapping: string
}


const env = cleanEnv(
  process.env,
  {
    CLOUD_TENANT: str({ desc: 'A Cloud Tenant ID' }),
    TENANT_CLIENT_ID: str({ desc: 'A Cloud Application ID' }),
    TENANT_CLIENT_SECRET: str({ desc: 'A Cloud Application Secret' }),
    OIDC_SCOPE: str({ desc: 'A Keycloak Client Scope for OIDC Compatibility' }),
    IDP_ALIAS: str({ desc: 'A name for the Identity Provider Entry' }),
    KEYCLOAK_CLIENT_ID: str({ desc: 'A Keycloak client application ID ' }),
    KEYCLOAK_CLIENT_SECRET: str({ desc: 'A Keycloak Client Application Secret' }),
    KEYCLOAK_CLIENT_SCOPES: json({ desc: 'A list of role names in JSON format' }),
    KEYCLOAK_REALM: str({ desc: 'Default Keycloak Realm' }),
    REDIRECT_URIS: json({ desc: 'A list of Redirect URI\'s in JSON format' }),
    IDP_GROUP_OTOMI_ADMIN: str({ desc: 'Otomi Admin IDP Group ID' }),
    IDP_GROUP_MAPPINGS_TEAMS: json({ desc: 'A list of Team Names and Group Id\'s from the IDP' }),
    OIDC_IDP_CONFIG: json({ desc: 'A oidc Provider configuration object' }),
  },
  { strict: true },
)

export function createClient(id: string = env.KEYCLOAK_CLIENT_ID,
    defaultClientScopes: Array<string> = env.KEYCLOAK_CLIENT_SCOPES,
    redirectUris: Array<string> = env.REDIRECT_URIS,
    secret: string = env.KEYCLOAK_CLIENT_SECRET): api.ClientRepresentation {
  const otomiClientRepresentation = defaultsDeep(new api.ClientRepresentation(),
    otomiClientCfgTpl(id, secret, defaultClientScopes, redirectUris)
  )
  return otomiClientRepresentation
}

export function createIdpMappers(idpAlias: string = env.IDP_ALIAS,
    teams: object = env.IDP_GROUP_MAPPINGS_TEAMS,
    adminGroupMapping: string = env.IDP_GROUP_OTOMI_ADMIN
  ): Array<api.IdentityProviderMapperRepresentation> {
  // admin idp mapper case
  const admin =  idpMapperTpl("map otomi-admin group to role", idpAlias, "admin", adminGroupMapping)
  const adminMappers =  defaultsDeep(new api.IdentityProviderMapperRepresentation(), admin) 
  // default idp mappers case
  const defaultIdps = defaultsIdpMapperTpl(idpAlias)
  const defaultMappers = defaultIdps.map((idpMapper) => {
    return defaultsDeep(new api.IdentityProviderMapperRepresentation(), idpMapper)
  })
  // team idp case - team list extracted from IDP_GROUP_MAPPINGS_TEAMS env 
  const teamList = utils.objectToArray(teams, "name", "groupMapping") as TeamMapping[] 
  const teamMappers = teamList.map((team) => {
    const teamMapper =  idpMapperTpl(`map ${team.name} group to role`, idpAlias, team.name, team.groupMapping)
    return defaultsDeep(new api.IdentityProviderMapperRepresentation(), teamMapper)
  })
  return teamMappers.concat(defaultMappers).concat(adminMappers)
}

export function createIdProvider(tenantId: string = env.CLOUD_TENANT,
    clientId: string = env.TENANT_CLIENT_ID,
    alias: string = env.IDP_ALIAS,
    clientSecret: string = env.TENANT_CLIENT_SECRET,
    oidcProvider: object = env.OIDC_IDP_CONFIG): api.IdentityProviderRepresentation {  
  const oidc = oidcProvider as OidcProvider
  const otomiClientIdp = defaultsDeep(new api.IdentityProviderRepresentation(),
    idpProviderCfgTpl(alias, tenantId, clientId, clientSecret, oidc)
  )
  return otomiClientIdp
}

export function createProtocolMappersForClientScope(): Array<api.ProtocolMapperRepresentation> {
  const protocolMapperRepresentations = protocolMappersList.map((protoMapper) => { 
    return defaultsDeep( new api.ProtocolMapperRepresentation(), protoMapper)
  })
  return protocolMapperRepresentations
}

export function createClientScopes(scope: string = env.OIDC_SCOPE) : api.ClientScopeRepresentation {
  const clientScopeRepresentation = defaultsDeep(new api.ClientScopeRepresentation(),
    clientScopeCfgTpl(scope, createProtocolMappersForClientScope())
  )
  return clientScopeRepresentation
}

export function mapTeamsToRoles(teams: object = env.IDP_GROUP_MAPPINGS_TEAMS,
    realm: string = env.KEYCLOAK_REALM): Array<api.RoleRepresentation> {
  // iterate through all the teams and map groups
  const teamList = utils.objectToArray(teams, "name", "groupMapping") as TeamMapping[] 
  const teamRoleRepresentations = teamList.map((team) => {
    const role = roleTpl(team.name, team.groupMapping, realm)
    const roleRepresentation = defaultsDeep(new api.RoleRepresentation(), role)
    return roleRepresentation
  })
  return teamRoleRepresentations
}
