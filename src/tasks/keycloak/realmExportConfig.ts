import { ProtocolMapperRepresentation, ResourceServerRepresentation } from "@redkubes/keycloak-10.0-client/dist/model/models";


export interface AuthenticationExecution {
  authenticator: string;
  requirement: string;
  priority: number;
  userSetupAllowed: boolean;
  autheticatorFlow: boolean;
  flowAlias: string;
  authenticatorConfig: string;
}

export interface AuthenticationFlow {
  id: string;
  alias: string;
  description: string;
  providerId: string;
  topLevel: boolean;
  builtIn: boolean;
  authenticationExecutions: AuthenticationExecution[];
}

export interface Config8 {
  "update.profile.on.first.login": string;
  "require.password.update.after.registration": string;
  defaultProvider: string;
}

export interface AuthenticatorConfig {
  id: string;
  alias: string;
  config: Config8;
}

export interface  ProtocolMappers {
  name: string,
  protocol: string,
  protocolMapper: string,
  consentRequired: boolean,
  // eslint-disable-next-line @typescript-eslint/ban-types
  config?: { [key: string]: Object } 
  // config: Map<string, object>
}

export interface Role {
  'attributes'?: {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [key: string]: Object,
  },
  clientRole: boolean,
  composite: boolean,
  containerId: string,
  description: string,
  name: string,
}


export interface IdentityProviderMapper{
  // eslint-disable-next-line @typescript-eslint/ban-types
  config?: { [key: string]: Object } 
  identityProviderAlias:	string,
  identityProviderMapper:	string,
  name:	string,  
}

export interface Client {
  'access'?: {
    [key: string]: Record<string, any>,
  },
  'adminUrl'?: string,
  'alwaysDisplayInConsole'?: boolean,
  // 'attributes'?: {
  //   [key: string]: Record<string, any>,
  // },
  // 'authenticationFlowBindingOverrides'?: {
  //   [key: string]: Record<string, any>,
  // },
  'authorizationServicesEnabled'?: boolean,
  // 'authorizationSettings'?: ResourceServerRepresentation,
  'baseUrl'?: string,
  'bearerOnly'?: boolean,
  'clientAuthenticatorType'?: string,
  'clientId'?: string,
  'consentRequired'?: boolean,
  'defaultClientScopes'?: Array<string>,
  'defaultRoles'?: Array<string>,
  'description'?: string,
  'directAccessGrantsEnabled'?: boolean,
  'enabled'?: boolean,
  'frontchannelLogout'?: boolean,
  'fullScopeAllowed'?: boolean,
  'id'?: string,
  'implicitFlowEnabled'?: boolean,
  'name'?: string,
  'nodeReRegistrationTimeout'?: number,
  'notBefore'?: number,
  'optionalClientScopes'?: Array<string>,
  'origin'?: string,
  'protocol'?: string,
  // 'protocolMappers'?: Array<ProtocolMapperRepresentation>,
  'publicClient'?: boolean,
  'redirectUris'?: Array<string>,
  // 'registeredNodes'?: {
  //   [key: string]: Record<string, any>,
  // },
  'registrationAccessToken'?: string,
  'rootUrl'?: string,
  'secret'?: string,
  'serviceAccountsEnabled'?: boolean,
  'standardFlowEnabled'?: boolean,
  'surrogateAuthRequired'?: boolean,
  // 'webOrigins'?: Array<string>,

}

export const identityProviderMappersObj = [
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
  {
    "name": "azure_map_otomi_admin_group_to_role",
    "identityProviderAlias": "redkubes-azure",
    "identityProviderMapper": "oidc-role-idp-mapper",
    "config": {
      "syncMode": "INHERIT",
      "claim": "groups",
      "role": "admin",
      "claim.value": "e69ded30-0882-4490-8e0f-2e67625a0693"
    }
  },
  {
    "name": "azure_map_team_demo_group_to_role",
    "identityProviderAlias": "redkubes-azure",
    "identityProviderMapper": "oidc-role-idp-mapper",
    "config": {
      "syncMode": "INHERIT",
      "claim": "groups",
      "role": "team-demo",
      "claim.value": "28010af7-9535-4265-8689-50f51f8f2c87"
    }
  },
  {
    "name": "azure_map_team_admin_group_to_role",
    "identityProviderAlias": "redkubes-azure",
    "identityProviderMapper": "oidc-role-idp-mapper",
    "config": {
      "syncMode": "INHERIT",
      "claim": "groups",
      "role": "team-admin",
      "claim.value": "3c63814c-59df-46c3-9a69-d9e1c3611097"
    }
  },
  {
    "name": "azure_map_team_dev_group_to_role",
    "identityProviderAlias": "redkubes-azure",
    "identityProviderMapper": "oidc-role-idp-mapper",
    "config": {
      "attribute.value": "3d2e6df8-c7c7-4d51-aa6a-9b7b5330d915",
      "syncMode": "INHERIT",
      "claim": "groups",
      "role": "team-dev",
      "claim.value": "3d2e6df8-c7c7-4d51-aa6a-9b7b5330d915"
    }
  },
  {
    "name": "azure_map_team_otomi_group_to_role",
    "identityProviderAlias": "redkubes-azure",
    "identityProviderMapper": "oidc-role-idp-mapper",
    "config": {
      "claims": "[]",
      "syncMode": "INHERIT",
      "claim": "groups",
      "role": "team-otomi",
      "claim.value": "0efd2f6d-fb8b-49a9-9507-54cd6e92c348"
    }
  }
]

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
]


export const rolesObj = [
    {
      "name": "team-admin",
      "description": "Has Azure IDP groupID: 3c63814c-59df-46c3-9a69-d9e1c3611097",
      "composite": false,
      "clientRole": false,
      "containerId": "master",
      "attributes": {}
    },
    {
      "name": "team-otomi",
      "description": "Has Azure IDP groupID: 0efd2f6d-fb8b-49a9-9507-54cd6e92c348",
      "composite": false,
      "clientRole": false,
      "containerId": "master",
      "attributes": {}
    },
    {
      "name": "team-demo",
      "description": "Has Azure IDP groupID: 28010af7-9535-4265-8689-50f51f8f2c87",
      "composite": false,
      "clientRole": false,
      "containerId": "master",
      "attributes": {}
    },
    {
      "name": "team-dev",
      "description": "Has Azure IDP groupID: 3d2e6df8-c7c7-4d51-aa6a-9b7b5330d915",
      "composite": false,
      "clientRole": false,
      "containerId": "master",
      "attributes": {}
    }
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

export const authenticationFlowsObject = [{
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

export const otomiClientConfigObj = {
    "clientId": "otomi",
    "surrogateAuthRequired": false,
    "enabled": true,
    "alwaysDisplayInConsole": false,
    "clientAuthenticatorType": "client-secret",
    "secret": "79e11c3d-0231-4882-95a7-36fd1e0b02b8",
    "redirectUris": [
      "https://apps.team-dev.dev.gke.otomi.cloud/*",
      "https://auth.dev.gke.otomi.cloud/*",
      "https://apps.team-demo.dev.gke.otomi.cloud/*",
      "https://harbor.dev.gke.otomi.cloud/*",
      "https://apps.team-admin.dev.gke.otomi.cloud/*",
      "https://apps.team-otomi.dev.gke.otomi.cloud/*",
      "https://apps.team-chai.dev.gke.otomi.cloud/*"
    ],
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
