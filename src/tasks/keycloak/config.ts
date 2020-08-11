export const adminIdpMappers = [
  {
    "name": "map_otomi_admin_group_to_role",
    "identityProviderAlias": "redkubes-azure",
    "identityProviderMapper": "oidc-role-idp-mapper",
    "config": {
      "syncMode": "INHERIT",
      "claim": "groups",
      "role": "admin",
      "claim.value": ""
    }
  },
]
export const defaultIdpMappers = [
  {
    "name": "upn_to_email",
    "identityProviderAlias": "redkubes-azure",
    "identityProviderMapper": "oidc-user-attribute-idp-mapper",
    "config": {
      "syncMode": "INHERIT",
      "claim": "upn",
      "user.attribute": "email"
    }
  },
]

export const teamIdpMappers = [
  {
    "name": "map_team_group_to_role",
    "identityProviderAlias": "redkubes-azure",
    "identityProviderMapper": "oidc-role-idp-mapper",
    "config": {
      "syncMode": "INHERIT",
      "claim": "groups",
      "role": "team-name",
      "claim.value": ""
    }
  },
]

export const protocolMappers = [
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
]

export const roles = [
  {
    "name": "",
    "description": "Mapped for incoming Cloud IDP GROUP_ID: ",
    "composite": false,
    "clientRole": false,
    "containerId": "",
    "attributes": {}
  },
]

export const authenticatorConfig = [
  {
    "alias": "create unique user config",
    "config": {
      "require.password.update.after.registration": "false"
    }
  },
  {
    "alias": "redkubes-azure",
    "config": {
      "defaultProvider": "redkubes-azure"
    }
  },
  {
    "alias": "review profile config",
    "config": {
      "update.profile.on.first.login": "missing"
    }
  }
]

export const authenticationFlows = [{
  "alias": "browser",
  "description": "browser based authentication",
  "providerId": "basic-flow",
  "topLevel": true,
  "builtIn": true,
  "authenticationExecutions": [
    {
      "authenticator": "auth-cookie",
      "requirement": "ALTERNATIVE",
      "priority": 10,
      "userSetupAllowed": false,
      "autheticatorFlow": false
    },
    {
      "authenticator": "auth-spnego",
      "requirement": "DISABLED",
      "priority": 20,
      "userSetupAllowed": false,
      "autheticatorFlow": false
    },
    {
      "authenticatorConfig": "redkubes-azure",
      "authenticator": "identity-provider-redirector",
      "requirement": "ALTERNATIVE",
      "priority": 25,
      "userSetupAllowed": false,
      "autheticatorFlow": false
    },
    {
      "requirement": "ALTERNATIVE",
      "priority": 30,
      "flowAlias": "forms",
      "userSetupAllowed": false,
      "autheticatorFlow": true
    }
  ]
}]

export const otomiClientConfig = {
    "clientId": "otomi",
    "surrogateAuthRequired": false,
    "enabled": true,
    "alwaysDisplayInConsole": false,
    "clientAuthenticatorType": "client-secret",
    "secret": "",
    "redirectUris": [],
    "webOrigins": [],
    "notBefore": 0,
    "bearerOnly": false,
    "consentRequired": false,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": true,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "authorizationServicesEnabled": true,
    "publicClient": false,
    "frontchannelLogout": false,
    "protocol": "openid-connect",
    "attributes": {
      "saml.assertion.signature": "false",
      "saml.force.post.binding": "false",
      "saml.multivalued.roles": "false",
      "saml.encrypt": "false",
      "saml.server.signature": "false",
      "saml.server.signature.keyinfo.ext": "false",
      "exclude.session.state.from.auth.response": "false",
      "saml_force_name_id_format": "false",
      "saml.client.signature": "false",
      "tls.client.certificate.bound.access.tokens": "false",
      "saml.authnstatement": "false",
      "display.on.consent.screen": "false",
      "saml.onetimeuse.condition": "false"
    },
    "authenticationFlowBindingOverrides": {
      "direct_grant": "c1d06bbf-2c80-4f96-8fe9-2c6ebaabd6ba",
      "browser": "91d58f83-abf1-4aaa-aa29-039e0c96a6d6"
    },
    "fullScopeAllowed": true,
    "nodeReRegistrationTimeout": -1,
    "protocolMappers": [
      {
        "name": "Client IP Address",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usersessionmodel-note-mapper",
        "consentRequired": false,
        "config": {
          "user.session.note": "clientAddress",
          "id.token.claim": "true",
          "access.token.claim": "true",
          "claim.name": "clientAddress",
          "jsonType.label": "String"
        }
      },
      {
        "name": "Client ID",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usersessionmodel-note-mapper",
        "consentRequired": false,
        "config": {
          "user.session.note": "clientId",
          "id.token.claim": "true",
          "access.token.claim": "true",
          "claim.name": "clientId",
          "jsonType.label": "String"
        }
      },
      {
        "name": "Client Host",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usersessionmodel-note-mapper",
        "consentRequired": false,
        "config": {
          "user.session.note": "clientHost",
          "id.token.claim": "true",
          "access.token.claim": "true",
          "claim.name": "clientHost",
          "jsonType.label": "String"
        }
      }
    ],
    "defaultClientScopes": [
      "web-origins",
      "role_list",
      "openid",
      "profile",
      "roles",
      "groups",
      "email"
    ],
    "optionalClientScopes": [
      "address",
      "phone",
      "offline_access",
      "microprofile-jwt"
    ],
    "authorizationSettings": {
      "allowRemoteResourceManagement": true,
      "policyEnforcementMode": "ENFORCING",
      "resources": [
        {
          "name": "Default Resource",
          "type": "urn:otomi:resources:default",
          "ownerManagedAccess": false,
          "attributes": {},
          "_id": "24b0c0a3-e890-43db-ac6c-1f8207666851",
          "uris": [
            "/*"
          ]
        }
      ],
      "policies": [
        {
          "name": "Default Policy",
          "description": "A policy that grants access only for users within this realm",
          "type": "js",
          "logic": "POSITIVE",
          "decisionStrategy": "AFFIRMATIVE",
          "config": {
            "code": "// by default, grants any permission associated with this policy\n$evaluation.grant();\n"
          }
        },
        {
          "name": "Default Permission",
          "description": "A permission that applies to the default resource type",
          "type": "resource",
          "logic": "POSITIVE",
          "decisionStrategy": "UNANIMOUS",
          "config": {
            "defaultResourceType": "urn:otomi:resources:default",
            "applyPolicies": "[\"Default Policy\"]"
          }
        }
      ],
      "scopes": [],
      "decisionStrategy": "UNANIMOUS"
    }
}
