
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

export interface IdentityProviderMapper{
  // eslint-disable-next-line @typescript-eslint/ban-types
  config?: { [key: string]: Object } 
  identityProviderAlias:	string,
  identityProviderMapper:	string,
  name:	string,  
}

export interface IdentityProviderConfig {
  userInfoUrl: string;
  validateSignature: string;
  clientId: string;
  tokenUrl: string;
  jwksUrl: string;
  issuer: string;
  useJwksUrl: string;
  authorizationUrl: string;
  clientAuthMethod: string;
  logoutUrl: string;
  syncMode: string;
  clientSecret: string;
  defaultScope: string;
}

export interface IdentityProvider {
  alias: string;
  displayName: string;
  internalId: string;
  providerId: string;
  enabled: boolean;
  updateProfileFirstLoginMode: string;
  trustEmail: boolean;
  storeToken: boolean;
  addReadTokenRoleOnCreate: boolean;
  authenticateByDefault: boolean;
  linkOnly: boolean;
  firstBrokerLoginFlowAlias: string;
  config: IdentityProviderConfig;
}
