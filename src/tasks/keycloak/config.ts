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

export const idpProviderCfgTpl = (alias: string, tenantId: string, clientId: string, clientSecret: string) => {
  return {
    alias: alias,
    displayName: alias,
    providerId: "oidc",
    enabled: true,
    trustEmail: true,
    firstBrokerLoginFlowAlias: "first broker login",
    config: {
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
    // attributes: otomiClientConfig.attributes,
    // @todo match correct types
    // authenticationFlowBindingOverrides: utils.objectToConfigMap(otomiClientConfig.authenticationFlowBindingOverrides)
  }
}
