/* eslint-disable @typescript-eslint/ban-types */
import * as api from "@redkubes/keycloak-10.0-client";
import { cleanEnv, str, json } from "envalid";
import {protocolMappersObj, ProtocolMappers} from "./clientScopeProtocolMappers"
import { ProtocolMapperRepresentation } from "@redkubes/keycloak-10.0-client";
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

export class KeycloakRealmSettingsGenerator {
  static idProvider: api.IdentityProviderRepresentation;
  static myClient: api.ClientRepresentation;
  static defaultClientScopes: Array<string>;
  static secret: string;

  static generateClient(id?: string, defaultClientScopes?: Array<string>|null, secret?: string|null): api.ClientRepresentation {
    this.myClient = new api.IdentityProviderRepresentation();
    this.myClient.id = id ? id : env.KEYCLOAK_CLIENT_ID;
    this.myClient.defaultClientScopes = defaultClientScopes ? defaultClientScopes : env.KEYCLOAK_DEFAULT_ROLES;
    this.myClient.secret = secret ? secret : env.KEYCLOAK_CLIENT_SECRET;
    
    return this.myClient;
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
    const mappers = [];
    protocolMappersObj.forEach((proto) => { 
      // const mapper = new ProtocolMapperRepresentation();
      // const mapper: ProtocolMappers = proto;
      const m: ProtocolMapperRepresentation = {};
      m.name = proto.name;
      m.protocol = proto.protocol;
      m.protocolMapper = proto.protocolMapper;
      m.config = utils.objectToConfigMap(proto.config)
      mappers.push(m)
    })
    return mappers;
  }

  
   
  
}
