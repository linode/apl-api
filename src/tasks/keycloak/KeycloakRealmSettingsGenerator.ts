/* eslint-disable @typescript-eslint/ban-types */
import * as api from "@redkubes/keycloak-10.0-client";
import { cleanEnv, str, json } from "envalid";
import {
  protocolMappersObj, ProtocolMappers, rolesObj, Role,
  identityProviderMappersObj, IdentityProviderMapper,
  otomiClientConfigObj, Client
} from "./realmExportConfig"
// import { ProtocolMapperRepresentation, RoleRepresentation } from "@redkubes/keycloak-10.0-client";
import * as utils from "../../utils"
import { IdentityProviderMapperRepresentation } from "@redkubes/keycloak-10.0-client";

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

export class KeycloakRealmSettingsGenerator {

  static generateClient(id?: string, defaultClientScopes?: Array<string>|null, secret?: string|null): api.ClientRepresentation {
    const client = new api.ClientRepresentation();
    console.log(`generating client::::::     ${id}`)
    // const mappedClient: Client = otomiClientConfigObj
    // client = mappedClient

     
    client.standardFlowEnabled = true
    client.implicitFlowEnabled = true
    client.directAccessGrantsEnabled = true
    client.serviceAccountsEnabled = true
    client.authorizationServicesEnabled = true

    client.id = id ? id : env.KEYCLOAK_CLIENT_ID;
    client.defaultClientScopes = defaultClientScopes ? defaultClientScopes : env.KEYCLOAK_DEFAULT_ROLES;
    client.secret = secret ? secret : env.KEYCLOAK_CLIENT_SECRET;
    client.attributes = utils.objectToConfigMap(otomiClientConfigObj.attributes)
    client.redirectUris = otomiClientConfigObj.redirectUris
    // ???
    // client.protocolMappers = utils.objectToConfigMap(otomiClientConfigObj.protocolMappers)
    
    client.authenticationFlowBindingOverrides = utils.objectToConfigMap(otomiClientConfigObj.authenticationFlowBindingOverrides)
    // authorizationSettings?
    
    
    return client;
  }

  static generateIdpMappers(): Array<IdentityProviderMapperRepresentation> {
    return identityProviderMappersObj.map((idpMapper) => {
      const idpm: IdentityProviderMapper = idpMapper
      // @todo remove
      idpm.identityProviderAlias = env.IDP_ALIAS

      // working with interface destructuring
      // idpm.config = utils.objectToConfigMap(idpMapper.config)
      return idpm
    })
  }

  
  static generateIdProvider(tenantId?: string | undefined, clientId?: string | undefined, secret?: string | undefined): api.IdentityProviderRepresentation {
    tenantId = tenantId ? tenantId : env.CLOUD_TENANT;
    
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
      clientId: clientId ? clientId : env.TENANT_CLIENT_ID,
      tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      jwksUrl: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      useJwksUrl: `true`,
      authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      clientAuthMethod: `client_secret_post`,
      logoutUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`,
      syncMode: "FORCE",
      clientSecret: secret ? secret : env.KEYCLOAK_CLIENT_SECRET,
      defaultScope: "openid email profile"
    };

    idp.config = utils.objectToConfigMap(config)
    return idp;
  }

  static generateClientScopes() : api.ClientScopeRepresentation {
    const clientScopes = new api.ClientScopeRepresentation();
    clientScopes.name = env.OIDC_SCOPE;
    clientScopes.protocol = "openid-connect";
    clientScopes.attributes = utils.objectToConfigMap({
      "include.in.token.scope": "true",
      "display.on.consent.screen": "true"
    })

    clientScopes.protocolMappers = this.generateProtocolMappersForClientScope()
    return clientScopes;
  }
  
  static generateProtocolMappersForClientScope(): Array<api.ProtocolMapperRepresentation> {
    return protocolMappersObj.map((proto) => { 
      const mapper: ProtocolMappers = proto;
      const m: api.ProtocolMapperRepresentation = mapper;
      // working with interface Types
      // m.config = utils.objectToConfigMap(proto.config);
      return m;
    })
  }

  static generateRoles(): Array<api.RoleRepresentation> {
    return rolesObj.map((role) => {
      const mappedRole: Role = role;
      // @todo remove
      mappedRole.name += "-devtest"
      const r: api.RoleRepresentation = mappedRole;
      return r;
    })
  }
  
   
  
}
