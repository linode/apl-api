export const defaultsIdpMapperTpl = (alias: string) => {
  return [
    {
      "name": "upn_to_email",
      "identityProviderAlias": alias,
      "identityProviderMapper": "oidc-user-attribute-idp-mapper",
      "config": {
        "syncMode": "INHERIT",
        "claim": "upn",
        "user.attribute": "email"
      }
    },
    {
      "name": "username mapping",
      "identityProviderAlias": alias,
      "identityProviderMapper": "oidc-username-idp-mapper",
      "config": {
        "template": "${CLAIM.given_name} ${CLAIM.family_name}",
        "syncMode": "INHERIT"
      }
    }
  ]
}

export const idpMapperTpl = (name: string,  alias: string, role: string, claim: string) => {
  return {
    "name": name,
    "identityProviderAlias": alias,
    "identityProviderMapper": "oidc-role-idp-mapper",
    "config": {
      "syncMode": "INHERIT",
      "claim": "groups",
      "role": role,
      "claim.value": claim
    }
  }
}

export const clientScopeCfgTpl = (scope: string, protocolMappers: object) => {
  return {
    name: scope,
    protocol: "openid-connect",
    attributes: {
      "include.in.token.scope": "true",
      "display.on.consent.screen": "true"
    },
    protocolMappers: protocolMappers,
  }
}

export const protocolMappersList = [
  {
    "name": "groups",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-usermodel-realm-role-mapper",
    "consentRequired": false,
    "config": {
      "multivalued": "true",
      "userinfo.token.claim": "true",
      "user.attribute": "",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "claim.name": "groups",
      "jsonType.label": "String"
    }
  },
  {
    "name": "email",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-usermodel-property-mapper",
    "consentRequired": false,
    "config": {
      "userinfo.token.claim": "true",
      "user.attribute": "email",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "claim.name": "email",
      "jsonType.label": "String"
    }
  },
  {
    "name": "realm roles",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-usermodel-realm-role-mapper",
    "consentRequired": false,
    "config": {
      "user.attribute": "",
      "access.token.claim": "true",
      "claim.name": "realm_access.roles",
      "jsonType.label": "String",
      "multivalued": "true"
    }
  },
  {
    "name": "client roles",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-usermodel-client-role-mapper",
    "consentRequired": false,
    "config": {
      "user.attribute": "",
      "access.token.claim": "true",
      "claim.name": "resource_access.${client_id}.roles",
      "jsonType.label": "String",
      "multivalued": "true"
    }
  },
  {
    "name": "username",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-usermodel-property-mapper",
    "consentRequired": false,
    "config": {
      "userinfo.token.claim": "true",
      "user.attribute": "username",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "claim.name": "preferred_username",
      "jsonType.label": "String"
    }
  }
]

export const roleTpl = (name: string, groupMapping: string, containerId: string) => {
  return {
    "name": name,
    "description": `Mapped for incoming Cloud IDP GROUP_ID: ${groupMapping}`,
    "composite": false,
    "clientRole": false,
    "containerId": containerId,
    "attributes": {}
  }
}


// cloud idprovider configurations
function oidcCfg(provider: OidcProvider, tenantId: string, clientId: string, clientSecret: string) {
  switch (provider.name) {
    // Azure AD configuration properties
    // https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc
    case "azure":
      return {
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
        clientSecret: clientSecret,
        defaultScope: "openid email profile"
      }
    
    // AWS Cogito configuration properties
    // @todo needs testing
    // https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html
    case "aws":
      return {
        userInfoUrl: `https://${provider.domain}.${provider.region}.amazoncognito.com/oauth2/userInfo`,
        validateSignature: "true",
        clientId: clientId,
        tokenUrl: `https://${provider.domain}.${provider.region}.amazoncognito.com/oauth2/token`,
        authorizationUrl: `https://${provider.domain}.${provider.region}.amazoncognito.com/oauth2/authorize`,
        clientAuthMethod: "client_secret_post",
        jwksUrl: `https://${provider.oidcUrl}.${provider.region}.amazonaws.com/${tenantId}/.well-known/jwks.json`,
        syncMode: "IMPORT",
        clientSecret: clientSecret,
        issuer: `https://${provider.oidcUrl}.${provider.region}.amazonaws.com/${tenantId}`,
        useJwksUrl: "true"
      }
  }
}

export const idpProviderCfgTpl = (alias: string, tenantId: string, clientId: string, clientSecret: string, provider: OidcProvider) => {
  // currently tested only on Azure AD
  return {
    alias: alias,
    displayName: alias,
    providerId: "oidc",
    enabled: true,
    trustEmail: true,
    firstBrokerLoginFlowAlias: "first broker login",
    config: oidcCfg(provider, tenantId, clientId, clientSecret)
  }
}

export const otomiClientCfgTpl = (id: string, secret: string, defaultClientScopes: object, redirectUris: object) => { 
  return {
    id: id,
    secret: secret,
    defaultClientScopes: defaultClientScopes,
    redirectUris: redirectUris,
    standardFlowEnabled: true,
    implicitFlowEnabled: true,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: true,
    authorizationServicesEnabled: true,
    // @todo match correct types
    // attributes: otomiClientConfig.attributes
    // authenticationFlowBindingOverrides: utils.objectToConfigMap(otomiClientConfig.authenticationFlowBindingOverrides)
  }
}


//type definition for imported ENV variable IDP_GROUP_MAPPINGS_TEAMS
export interface TeamMapping {
  name: string,
  groupMapping: string,
}

export interface OidcProvider {
  name: string,
  region?: string,
  domain?: string,
  oidcUrl?: string,
}
