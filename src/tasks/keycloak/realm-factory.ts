/* eslint-disable @typescript-eslint/ban-types */
import * as api from "@redkubes/keycloak-10.0-client";
import { cleanEnv, str, json } from "envalid";
import {
  roles,
  protocolMappers,
  identityProviderMappers, 
  otomiClientConfig, 
  authenticationFlows
} from "./config"
import {
  Role,
  ProtocolMappers,
  IdentityProviderMapper,
  Client
} from "./interfaces"
import * as utils from "../../utils"

const env = cleanEnv(
  process.env,
  {
    CLOUD_TENANT: str({ desc: 'A Cloud Tenant ID' }),
    TENANT_CLIENT_ID: str({ desc: 'A Cloud Application ID' }),
    IDP_ALIAS: str({ desc: 'A name for the Identity Provider Entry' }),
    KEYCLOAK_CLIENT_ID: str({ desc: 'A Keycloak client application ID ' }),
    KEYCLOAK_CLIENT_SECRET: str({ desc: 'A Keycloak Client Application Secret' }),
    OIDC_SCOPE: str({ desc: 'A Keycloak Client Scope for OIDC Compatibility' }),
    KEYCLOAK_DEFAULT_ROLES: json({ desc: 'A list of role names in JSON format' }),
  },
  { strict: true },
)

  export function createClient(id: string = env.KEYCLOAK_CLIENT_ID, defaultClientScopes: Array<string> = env.KEYCLOAK_DEFAULT_ROLES, secret: string = env.KEYCLOAK_CLIENT_SECRET): api.ClientRepresentation {
    console.log(`generating client::::::     ${id}`)
    const client = new api.ClientRepresentation();
    client.id = id
    client.defaultClientScopes = defaultClientScopes
    client.secret = secret  
    client.standardFlowEnabled = true
    client.implicitFlowEnabled = true
    client.directAccessGrantsEnabled = true
    client.serviceAccountsEnabled = true
    client.authorizationServicesEnabled = true
    client.attributes = utils.objectToConfigMap(otomiClientConfig.attributes)
    client.redirectUris = otomiClientConfig.redirectUris
    // @todo match correct types
    // client.authenticationFlowBindingOverrides = utils.objectToConfigMap(otomiClientConfig.authenticationFlowBindingOverrides)
    return client
  }

  export function createIdpMappers(idpAlias: string = env.IDP_ALIAS): Array<api.IdentityProviderMapperRepresentation> {
    return identityProviderMappers.map((idpMapper) => {
      const idpm: IdentityProviderMapper = idpMapper
      idpm.identityProviderAlias = idpAlias
      return idpm
    })
  }

  export function createIdProvider(tenantId: string = env.CLOUD_TENANT, clientId: string = env.TENANT_CLIENT_ID, secret: string = env.KEYCLOAK_CLIENT_SECRET): api.IdentityProviderRepresentation {
       
    const idp = new api.IdentityProviderRepresentation();
    idp.alias = env.IDP_ALIAS;
    idp.displayName = env.IDP_ALIAS;
    idp.providerId = "oidc";
    idp.enabled = true;
    idp.trustEmail = true;
    idp.firstBrokerLoginFlowAlias = "first broker login";
    const config = {
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
    };

    idp.config = utils.objectToConfigMap(config)
    return idp;
  }

  export function createClientScopes() : api.ClientScopeRepresentation {
    const clientScopes = new api.ClientScopeRepresentation();
    clientScopes.name = env.OIDC_SCOPE;
    clientScopes.protocol = "openid-connect";
    clientScopes.attributes = utils.objectToConfigMap({
      "include.in.token.scope": "true",
      "display.on.consent.screen": "true"
    })

    clientScopes.protocolMappers = this.createProtocolMappersForClientScope()
    return clientScopes;
  }
  
  export function createProtocolMappersForClientScope(): Array<api.ProtocolMapperRepresentation> {
    return protocolMappers.map((proto) => { 
      const mapper: ProtocolMappers = proto;
      const m: api.ProtocolMapperRepresentation = mapper;
      // working with interface Types
      // m.config = utils.objectToConfigMap(proto.config);
      return m;
    })
  }

  export function createRoles(): Array<api.RoleRepresentation> {
    return roles.map((role) => {
      const mappedRole: Role = role;
      // @todo remove
      // mappedRole.name += "-devtest"
      const r: api.RoleRepresentation = mappedRole;
      return r;
    })
  }
  
  // static createAuthenticationFlows(): AuthenticationFlowRepresentation {
  //   const authFlow = new AuthenticationFlowRepresentation();
  //   authFlow = authenticationFlowsObject;
  //   return authFlow
  //   // AuthenticatorConfigRepresentation
  // }
  
