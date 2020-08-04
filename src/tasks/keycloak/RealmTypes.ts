/* eslint-disable @typescript-eslint/no-empty-interface */
// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace namespace {

    export interface Attributes {
    }

    export interface Client {
        "master-realm": string[];
    }

    export interface Composites {
        realm: string[];
        client: Client;
    }

    export interface Realm {
        id: string;
        name: string;
        description: string;
        composite: boolean;
        clientRole: boolean;
        containerId: string;
        attributes: Attributes;
        composites: Composites;
    }

    export interface Attributes2 {
    }

    export interface Otomi {
        id: string;
        name: string;
        composite: boolean;
        clientRole: boolean;
        containerId: string;
        attributes: Attributes2;
    }

    export interface Attributes3 {
    }

    export interface Broker {
        id: string;
        name: string;
        description: string;
        composite: boolean;
        clientRole: boolean;
        containerId: string;
        attributes: Attributes3;
    }

    export interface Attributes4 {
    }

    export interface Client3 {
        "master-realm": string[];
    }

    export interface Composites2 {
        client: Client3;
    }

    export interface MasterRealm {
        id: string;
        name: string;
        description: string;
        composite: boolean;
        clientRole: boolean;
        containerId: string;
        attributes: Attributes4;
        composites: Composites2;
    }

    export interface Attributes5 {
    }

    export interface Client4 {
        account: string[];
    }

    export interface Composites3 {
        client: Client4;
    }

    export interface Account {
        id: string;
        name: string;
        description: string;
        composite: boolean;
        clientRole: boolean;
        containerId: string;
        attributes: Attributes5;
        composites: Composites3;
    }

    export interface Client2 {
        "otomi-devtest": any[];
        otomi: Otomi[];
        "security-admin-console": any[];
        "admin-cli": any[];
        "account-console": any[];
        broker: Broker[];
        "master-realm": MasterRealm[];
        account: Account[];
    }

    export interface Roles {
        realm: Realm[];
        client: Client2;
    }

    export interface ClientRoles {
        otomi: string[];
        account: string[];
    }

    export interface User {
        id: string;
        createdTimestamp: number;
        username: string;
        enabled: boolean;
        totp: boolean;
        emailVerified: boolean;
        serviceAccountClientId: string;
        disableableCredentialTypes: any[];
        requiredActions: any[];
        realmRoles: string[];
        clientRoles: ClientRoles;
        notBefore: number;
        groups: any[];
    }

    export interface ScopeMapping {
        clientScope: string;
        roles: string[];
    }

    export interface Account2 {
        client: string;
        roles: string[];
    }

    export interface ClientScopeMappings {
        account: Account2[];
    }

    export interface Attributes6 {
        "pkce.code.challenge.method": string;
        "saml.assertion.signature": string;
        "saml.force.post.binding": string;
        "saml.multivalued.roles": string;
        "saml.encrypt": string;
        "saml.server.signature": string;
        "saml.server.signature.keyinfo.ext": string;
        "exclude.session.state.from.auth.response": string;
        "saml_force_name_id_format": string;
        "saml.client.signature": string;
        "tls.client.certificate.bound.access.tokens": string;
        "saml.authnstatement": string;
        "display.on.consent.screen": string;
        "saml.onetimeuse.condition": string;
    }

    export interface AuthenticationFlowBindingOverrides {
        direct_grant: string;
        browser: string;
    }

    export interface Config {
        "user.session.note": string;
        "id.token.claim": string;
        "access.token.claim": string;
        "claim.name": string;
        "jsonType.label": string;
        "userinfo.token.claim": string;
        "user.attribute": string;
    }

    export interface ProtocolMapper {
        id: string;
        name: string;
        protocol: string;
        protocolMapper: string;
        consentRequired: boolean;
        config: Config;
    }

    export interface Attributes7 {
    }

    export interface Resource {
        name: string;
        type: string;
        ownerManagedAccess: boolean;
        attributes: Attributes7;
        _id: string;
        uris: string[];
    }

    export interface Config2 {
        code: string;
        defaultResourceType: string;
        applyPolicies: string;
    }

    export interface Policy {
        id: string;
        name: string;
        description: string;
        type: string;
        logic: string;
        decisionStrategy: string;
        config: Config2;
    }

    export interface AuthorizationSettings {
        allowRemoteResourceManagement: boolean;
        policyEnforcementMode: string;
        resources: Resource[];
        policies: Policy[];
        scopes: any[];
        decisionStrategy: string;
    }

    export interface Client5 {
        id: string;
        clientId: string;
        name: string;
        rootUrl: string;
        baseUrl: string;
        surrogateAuthRequired: boolean;
        enabled: boolean;
        alwaysDisplayInConsole: boolean;
        clientAuthenticatorType: string;
        secret: string;
        defaultRoles: string[];
        redirectUris: string[];
        webOrigins: string[];
        notBefore: number;
        bearerOnly: boolean;
        consentRequired: boolean;
        standardFlowEnabled: boolean;
        implicitFlowEnabled: boolean;
        directAccessGrantsEnabled: boolean;
        serviceAccountsEnabled: boolean;
        publicClient: boolean;
        frontchannelLogout: boolean;
        protocol: string;
        attributes: Attributes6;
        authenticationFlowBindingOverrides: AuthenticationFlowBindingOverrides;
        fullScopeAllowed: boolean;
        nodeReRegistrationTimeout: number;
        defaultClientScopes: string[];
        optionalClientScopes: string[];
        protocolMappers: ProtocolMapper[];
        authorizationServicesEnabled?: boolean;
        authorizationSettings: AuthorizationSettings;
    }

    export interface Attributes8 {
        "include.in.token.scope": string;
        "display.on.consent.screen": string;
        "consent.screen.text": string;
    }

    export interface Config3 {
        "user.attribute": string;
        "access.token.claim": string;
        "claim.name": string;
        "jsonType.label": string;
        "multivalued": string;
        "userinfo.token.claim": string;
        "id.token.claim": string;
        "user.attribute.formatted": string;
        "user.attribute.country": string;
        "user.attribute.postal_code": string;
        "user.attribute.street": string;
        "user.attribute.region": string;
        "user.attribute.locality": string;
        "single": string;
        "attribute.nameformat": string;
        "attribute.name": string;
    }

    export interface ProtocolMapper2 {
        id: string;
        name: string;
        protocol: string;
        protocolMapper: string;
        consentRequired: boolean;
        config: Config3;
    }

    export interface ClientScope {
        id: string;
        name: string;
        protocol: string;
        attributes: Attributes8;
        protocolMappers: ProtocolMapper2[];
        description: string;
    }

    export interface BrowserSecurityHeaders {
        contentSecurityPolicyReportOnly: string;
        xContentTypeOptions: string;
        xRobotsTag: string;
        xFrameOptions: string;
        contentSecurityPolicy: string;
        xXSSProtection: string;
        strictTransportSecurity: string;
    }

    export interface SmtpServer {
    }

    export interface Config4 {
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
        config: Config4;
    }

    export interface Config5 {
        syncMode: string;
        claim: string;
        "user.attribute": string;
        role: string;
        "claim.value": string;
        "attribute.value": string;
        claims: string;
    }

    export interface IdentityProviderMapper {
        id: string;
        name: string;
        identityProviderAlias: string;
        identityProviderMapper: string;
        config: Config5;
    }

    export interface SubComponents {
    }

    export interface Config6 {
        "host-sending-registration-request-must-match": string[];
        "client-uris-must-match": string[];
        "allow-default-scopes": string[];
        "allowed-protocol-mapper-types": string[];
        "max-clients": string[];
    }

    export interface OrgKeycloakServicesClientregistrationPolicyClientRegistrationPolicy {
        id: string;
        name: string;
        providerId: string;
        subType: string;
        subComponents: SubComponents;
        config: Config6;
    }

    export interface SubComponents2 {
    }

    export interface Config7 {
        priority: string[];
        algorithm: string[];
    }

    export interface OrgKeycloakKeysKeyProvider {
        id: string;
        name: string;
        providerId: string;
        subComponents: SubComponents2;
        config: Config7;
    }

    export interface Components {
        "org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy": OrgKeycloakServicesClientregistrationPolicyClientRegistrationPolicy[];
        "org.keycloak.keys.KeyProvider": OrgKeycloakKeysKeyProvider[];
    }

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

    export interface Config9 {
    }

    export interface RequiredAction {
        alias: string;
        name: string;
        providerId: string;
        enabled: boolean;
        defaultAction: boolean;
        priority: number;
        config: Config9;
    }

    export interface Attributes9 {
        clientSessionIdleTimeout: string;
        clientSessionMaxLifespan: string;
    }

    export interface RootObject {
        id: string;
        realm: string;
        displayName: string;
        displayNameHtml: string;
        notBefore: number;
        revokeRefreshToken: boolean;
        refreshTokenMaxReuse: number;
        accessTokenLifespan: number;
        accessTokenLifespanForImplicitFlow: number;
        ssoSessionIdleTimeout: number;
        ssoSessionMaxLifespan: number;
        ssoSessionIdleTimeoutRememberMe: number;
        ssoSessionMaxLifespanRememberMe: number;
        offlineSessionIdleTimeout: number;
        offlineSessionMaxLifespanEnabled: boolean;
        offlineSessionMaxLifespan: number;
        clientSessionIdleTimeout: number;
        clientSessionMaxLifespan: number;
        accessCodeLifespan: number;
        accessCodeLifespanUserAction: number;
        accessCodeLifespanLogin: number;
        actionTokenGeneratedByAdminLifespan: number;
        actionTokenGeneratedByUserLifespan: number;
        enabled: boolean;
        sslRequired: string;
        registrationAllowed: boolean;
        registrationEmailAsUsername: boolean;
        rememberMe: boolean;
        verifyEmail: boolean;
        loginWithEmailAllowed: boolean;
        duplicateEmailsAllowed: boolean;
        resetPasswordAllowed: boolean;
        editUsernameAllowed: boolean;
        bruteForceProtected: boolean;
        permanentLockout: boolean;
        maxFailureWaitSeconds: number;
        minimumQuickLoginWaitSeconds: number;
        waitIncrementSeconds: number;
        quickLoginCheckMilliSeconds: number;
        maxDeltaTimeSeconds: number;
        failureFactor: number;
        roles: Roles;
        groups: any[];
        defaultRoles: string[];
        requiredCredentials: string[];
        otpPolicyType: string;
        otpPolicyAlgorithm: string;
        otpPolicyInitialCounter: number;
        otpPolicyDigits: number;
        otpPolicyLookAheadWindow: number;
        otpPolicyPeriod: number;
        otpSupportedApplications: string[];
        webAuthnPolicyRpEntityName: string;
        webAuthnPolicySignatureAlgorithms: string[];
        webAuthnPolicyRpId: string;
        webAuthnPolicyAttestationConveyancePreference: string;
        webAuthnPolicyAuthenticatorAttachment: string;
        webAuthnPolicyRequireResidentKey: string;
        webAuthnPolicyUserVerificationRequirement: string;
        webAuthnPolicyCreateTimeout: number;
        webAuthnPolicyAvoidSameAuthenticatorRegister: boolean;
        webAuthnPolicyAcceptableAaguids: any[];
        webAuthnPolicyPasswordlessRpEntityName: string;
        webAuthnPolicyPasswordlessSignatureAlgorithms: string[];
        webAuthnPolicyPasswordlessRpId: string;
        webAuthnPolicyPasswordlessAttestationConveyancePreference: string;
        webAuthnPolicyPasswordlessAuthenticatorAttachment: string;
        webAuthnPolicyPasswordlessRequireResidentKey: string;
        webAuthnPolicyPasswordlessUserVerificationRequirement: string;
        webAuthnPolicyPasswordlessCreateTimeout: number;
        webAuthnPolicyPasswordlessAvoidSameAuthenticatorRegister: boolean;
        webAuthnPolicyPasswordlessAcceptableAaguids: any[];
        users: User[];
        scopeMappings: ScopeMapping[];
        clientScopeMappings: ClientScopeMappings;
        clients: Client5[];
        clientScopes: ClientScope[];
        defaultDefaultClientScopes: string[];
        defaultOptionalClientScopes: string[];
        browserSecurityHeaders: BrowserSecurityHeaders;
        smtpServer: SmtpServer;
        eventsEnabled: boolean;
        eventsListeners: string[];
        enabledEventTypes: string[];
        adminEventsEnabled: boolean;
        adminEventsDetailsEnabled: boolean;
        identityProviders: IdentityProvider[];
        identityProviderMappers: IdentityProviderMapper[];
        components: Components;
        internationalizationEnabled: boolean;
        supportedLocales: any[];
        authenticationFlows: AuthenticationFlow[];
        authenticatorConfig: AuthenticatorConfig[];
        requiredActions: RequiredAction[];
        browserFlow: string;
        registrationFlow: string;
        directGrantFlow: string;
        resetCredentialsFlow: string;
        clientAuthenticationFlow: string;
        dockerAuthenticationFlow: string;
        attributes: Attributes9;
        keycloakVersion: string;
        userManagedAccessAllowed: boolean;
    }

}

