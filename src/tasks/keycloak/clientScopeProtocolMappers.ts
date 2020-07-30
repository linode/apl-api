export const protocolMappersObj = [
  {
    "name": "groups",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-usermodel-realm-role-mapper",
    "consentRequired": false,
    "config": {
      "multivalued": "true",
      "userinfo.token.claim": "true",
      "user.attribute": "foo",
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
      "user.attribute": "foo",
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
      "user.attribute": "foo",
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
];

export interface  ProtocolMappers {
  name: string,
  protocol: string,
  protocolMapper: string,
  consentRequired: boolean,
  // config?: { [key: string]: Record<string, any> } 
  // config: Map<string, object>
}
