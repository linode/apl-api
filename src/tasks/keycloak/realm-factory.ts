/* eslint-disable @typescript-eslint/ban-types */
import * as api from '@redkubes/keycloak-client-node'
import * as utils from '../../utils'
import { defaultsDeep } from 'lodash'
import {
  cleanEnv,
  TENANT_ID,
  TENANT_CLIENT_ID,
  TENANT_CLIENT_SECRET,
  IDP_ALIAS,
  KEYCLOAK_CLIENT_SECRET,
  KEYCLOAK_REALM,
  REDIRECT_URIS,
  IDP_GROUP_OTOMI_ADMIN,
  IDP_GROUP_MAPPINGS_TEAMS,
  IDP_OIDC_URL,
} from '../../validators'

import {
  roleTpl,
  idpMapperTpl,
  defaultsIdpMapperTpl,
  protocolMappersList,
  idpProviderCfgTpl,
  clientScopeCfgTpl,
  otomiClientCfgTpl,
  TeamMapping,
} from './config'

const env = cleanEnv(
  process.env,
  {
    TENANT_ID,
    TENANT_CLIENT_ID,
    TENANT_CLIENT_SECRET,
    IDP_ALIAS,
    KEYCLOAK_CLIENT_SECRET,
    KEYCLOAK_REALM,
    REDIRECT_URIS,
    IDP_GROUP_OTOMI_ADMIN,
    IDP_GROUP_MAPPINGS_TEAMS,
    IDP_OIDC_URL,
  },
  { strict: true },
)

export function createClient(
  redirectUris: Array<string> = env.REDIRECT_URIS,
  secret: string = env.KEYCLOAK_CLIENT_SECRET,
): api.ClientRepresentation {
  const otomiClientRepresentation = defaultsDeep(
    new api.ClientRepresentation(),
    otomiClientCfgTpl(secret, redirectUris),
  )
  return otomiClientRepresentation
}

export function createIdpMappers(
  idpAlias: string = env.IDP_ALIAS,
  teams: object = env.IDP_GROUP_MAPPINGS_TEAMS,
  adminGroupMapping: string = env.IDP_GROUP_OTOMI_ADMIN,
): Array<api.IdentityProviderMapperRepresentation> {
  // admin idp mapper case
  const admin = idpMapperTpl('map otomi-admin group to role', idpAlias, 'admin', adminGroupMapping)
  const adminMappers = defaultsDeep(new api.IdentityProviderMapperRepresentation(), admin)
  // default idp mappers case
  const defaultIdps = defaultsIdpMapperTpl(idpAlias)
  const defaultMappers = defaultIdps.map((idpMapper) => {
    return defaultsDeep(new api.IdentityProviderMapperRepresentation(), idpMapper)
  })
  // team idp case - team list extracted from IDP_GROUP_MAPPINGS_TEAMS env
  const teamList = utils.objectToArray(teams, 'name', 'groupMapping') as TeamMapping[]
  const teamMappers = teamList.map((team) => {
    const teamMapper = idpMapperTpl(`map ${team.name} group to role`, idpAlias, team.name, team.groupMapping)
    return defaultsDeep(new api.IdentityProviderMapperRepresentation(), teamMapper)
  })
  return teamMappers.concat(defaultMappers).concat(adminMappers)
}

export async function createIdProvider(
  tenantId: string = env.TENANT_ID,
  clientId: string = env.TENANT_CLIENT_ID,
  alias: string = env.IDP_ALIAS,
  clientSecret: string = env.TENANT_CLIENT_SECRET,
  oidcUrl: string = env.IDP_OIDC_URL,
): Promise<api.IdentityProviderRepresentation> {
  const otomiClientIdp = defaultsDeep(
    new api.IdentityProviderRepresentation(),
    await idpProviderCfgTpl(alias, tenantId, clientId, clientSecret, oidcUrl),
  )
  return otomiClientIdp
}

export function createProtocolMappersForClientScope(): Array<api.ProtocolMapperRepresentation> {
  const protocolMapperRepresentations = protocolMappersList.map((protoMapper) => {
    return defaultsDeep(new api.ProtocolMapperRepresentation(), protoMapper)
  })
  return protocolMapperRepresentations
}

export function createClientScopes(): api.ClientScopeRepresentation {
  const clientScopeRepresentation = defaultsDeep(
    new api.ClientScopeRepresentation(),
    clientScopeCfgTpl(createProtocolMappersForClientScope()),
  )
  return clientScopeRepresentation
}

export function mapTeamsToRoles(
  teams: object = env.IDP_GROUP_MAPPINGS_TEAMS,
  realm: string = env.KEYCLOAK_REALM,
): Array<api.RoleRepresentation> {
  // iterate through all the teams and map groups
  const teamList = utils.objectToArray(teams, 'name', 'groupMapping') as TeamMapping[]
  const teamRoleRepresentations = teamList.map((team) => {
    const role = roleTpl(team.name, team.groupMapping, realm)
    const roleRepresentation = defaultsDeep(new api.RoleRepresentation(), role)
    return roleRepresentation
  })
  return teamRoleRepresentations
}
