import { Request } from 'express'
import { JSONSchema4 } from 'json-schema'
import { components, external, operations, paths } from 'src/generated-schema'
import OtomiStack from 'src/otomi-stack'

export type App = components['schemas']['App']
export type AppList = components['schemas']['AppList']
export type Backup = components['schemas']['Backup']
export type AplBackupRequest = components['schemas']['AplBackupRequest']
export type AplBackupResponse = components['schemas']['AplBackupResponse']
export type AplKnowledgeBaseRequest = components['schemas']['AplKnowledgeBaseRequest']
export type AplKnowledgeBaseResponse = components['schemas']['AplKnowledgeBaseResponse']
export type AplAgentRequest = components['schemas']['AplAgentRequest']
export type AplAgentResponse = components['schemas']['AplAgentResponse']
export type AplAIModelResponse = components['schemas']['AplAIModelResponse']
export type Kubecfg = components['schemas']['Kubecfg']
export type K8sService = components['schemas']['K8sService']
export type Netpol = components['schemas']['Netpol']
export type AplNetpolRequest = components['schemas']['AplNetpolRequest']
export type AplNetpolResponse = components['schemas']['AplNetpolResponse']
export type SealedSecret = components['schemas']['SealedSecret']
export type AplSecretRequest = components['schemas']['AplSecretRequest']
export type AplSecretResponse = components['schemas']['AplSecretResponse']
export type SealedSecretsKeys = components['schemas']['SealedSecretsKeys']
export type K8sSecret = components['schemas']['K8sSecret']
export type Service = components['schemas']['Service']
export type ServiceSpec = components['schemas']['AplService']['spec'] & {
  id?: string
  teamId?: string
  name: string
}
export type AplServiceRequest = components['schemas']['AplServiceRequest']
export type AplServiceResponse = components['schemas']['AplServiceResponse']
export type Session = components['schemas']['Session']
export type ObjWizard = components['schemas']['ObjWizard']
export type Settings = components['schemas']['Settings']
export type SettingsInfo = components['schemas']['SettingsInfo']
export type RepoBranches = components['schemas']['RepoBranches']
export type TestRepoConnect = components['schemas']['TestRepoConnect']
export type InternalRepoUrls = components['schemas']['InternalRepoUrls']
export type Team = components['schemas']['Team']
export type AplTeamSettingsRequest = components['schemas']['AplTeamSettingsRequest']
export type AplTeamSettingsResponse = components['schemas']['AplTeamSettingsResponse']
export type TeamSelfService = components['schemas']['Team']['selfService']
export type SessionUser = components['schemas']['SessionUser']
export type UserAuthz = components['schemas']['SessionUser']['authz']
export type Workload = components['schemas']['Workload']
export type WorkloadName = components['schemas']['WorkloadName']
export type WorkloadValues = components['schemas']['WorkloadValues']
export type AplWorkloadRequest = components['schemas']['AplWorkloadRequest']
export type AplWorkloadResponse = components['schemas']['AplWorkloadResponse']
export type User = components['schemas']['User']
export type CodeRepo = components['schemas']['CodeRepo']
export type AplCodeRepoRequest = components['schemas']['AplCodeRepoRequest']
export type AplCodeRepoResponse = components['schemas']['AplCodeRepoResponse']
export type Build = components['schemas']['Build']
export type AplBuildRequest = components['schemas']['AplBuildRequest']
export type AplBuildResponse = components['schemas']['AplBuildResponse']
export type Policy = components['schemas']['Policy']
export type Policies = components['schemas']['Policies']
export type AplPolicyRequest = components['schemas']['AplPolicyRequest']
export type AplPolicyResponse = components['schemas']['AplPolicyResponse']
export type Cloudtty = components['schemas']['Cloudtty']
export type TeamAuthz = components['schemas']['TeamAuthz']
// Derived setting models
export type Alerts = Settings['alerts']
export type Cluster = Settings['cluster']
export type Dns = Settings['dns']
export type Ingress = Settings['ingress']
export type Smtp = Settings['smtp']
export type Kms = Settings['kms']
export type Oidc = Settings['oidc']
export type Otomi = Settings['otomi']
export type Versions = Settings['versions']

export type AplRequestObject =
  | AplBackupRequest
  | AplBuildRequest
  | AplCodeRepoRequest
  | AplKnowledgeBaseRequest
  | AplAgentRequest
  | AplNetpolRequest
  | AplPolicyRequest
  | AplSecretRequest
  | AplServiceRequest
  | AplWorkloadRequest
  | AplTeamSettingsRequest
export type AplResponseObject =
  | AplBackupResponse
  | AplBuildResponse
  | AplCodeRepoResponse
  | AplKnowledgeBaseResponse
  | AplAgentResponse
  | AplNetpolResponse
  | AplPolicyResponse
  | AplSecretResponse
  | AplServiceResponse
  | AplWorkloadResponse
  | AplTeamSettingsResponse
export type AplKind =
  | 'AplApp'
  | 'AplAlertSet'
  | 'AplCluster'
  | 'AplDatabase'
  | 'AplDns'
  | 'AplIngress'
  | 'AplObjectStorage'
  | 'AplKms'
  | 'AplIdentityProvider'
  | 'AplCapabilitySet'
  | 'AplSmtp'
  | 'AplBackupCollection'
  | 'AplUser'
  | 'AplPlatformSettingSet'
  | 'AkamaiKnowledgeBase'
  | 'AkamaiAgent'
  | 'AplTeamCodeRepo'
  | 'AplTeamBuild'
  | 'AplTeamPolicy'
  | 'AplTeamSettingSet'
  | 'AplTeamNetworkControl'
  | 'AplTeamBackup'
  | 'AplTeamSecret'
  | 'AplTeamService'
  | 'AplTeamWorkload'
  | 'AplTeamWorkloadValues'
  | 'AplTeamTool'
  | 'AplVersion'
export type V1ApiObject = Build | CodeRepo | Netpol | SealedSecret | Service | Workload

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T

export interface OpenApiRequest extends Request {
  // Support both express-openapi and express-openapi-validator
  operationDoc?: {
    responses: { '200'?: { content: { 'application/json': { schema: { $ref: string } } } } }
    security: any[]
    operationId: string
    'x-aclSchema'?: string
  }
  apiDoc?: OpenAPIDoc
  // express-openapi-validator uses req.openapi
  openapi?: {
    schema: {
      responses?: { '200'?: { content: { 'application/json': { schema: { $ref: string } } } } }
      security?: any[]
      operationId?: string
      'x-aclSchema'?: string
    }
    // Path parameters parsed from the URL (e.g., {teamId} -> pathParams.teamId)
    pathParams?: Record<string, any>
    // The Express route pattern (e.g., /v1/teams/:teamId/coderepos)
    expressRoute?: string
    // The OpenAPI route pattern (e.g., /v1/teams/{teamId}/coderepos)
    openApiRoute?: string
  }
  session: Session
  user?: SessionUser
}

type HttpMethodType = 'delete' | 'read' | 'create' | 'update'

export interface OpenAPIDoc {
  components: {
    schemas: {
      [schemaName: string]: Schema
    }
  }
  paths?: {
    [path: string]: {
      [key in HttpMethodType]: {
        'x-aclSchema'?: [string]
        security?: [string]
      }
    }
  }
  security?: string[]
}

export interface OtomiSpec {
  components: components
  paths: paths
  operations: operations
  external: external
}

export type SchemaType = 'object' | 'array'

export interface PermissionSchema {
  properties: {
    [propertyName: string]: {
      items: {
        enum: Array<string>
      }
    }
  }
}

export interface Schema extends JSONSchema4 {
  'x-acl'?: Acl
  nullable?: boolean
}

export interface Acl {
  [roleName: string]: AclAction[]
}

export type AclAction =
  | 'create'
  | 'create-any'
  | 'delete'
  | 'delete-any'
  | 'read'
  | 'read-any'
  | 'update'
  | 'update-any'

export enum SessionRole {
  PlatformAdmin = 'platformAdmin',
  TeamAdmin = 'teamAdmin',
  TeamMember = 'teamMember',
}

export interface JWT {
  name: string
  email: string
  groups: string[]
  roles?: string[]
  sub: string
}

export interface OpenApiRequestExt extends OpenApiRequest, Session {
  user: SessionUser
  // Flag that indicates if experess-openapi middleware take up further authorization action
  isSecurityHandler?: boolean
  otomi: OtomiStack
}

export interface Core {
  k8s: Record<string, Record<string, any>[]>
  adminApps: Record<string, any>[]
  alerts: Alerts
  apps: Record<string, any>[]
  appsInfo: Record<string, any>[]
  cluster: Cluster
  dns: Dns
  kms: Kms
  oidc: Oidc
  otomi: Otomi
  teamApps: Record<string, any>[]
  teamConfig: Record<string, any>
  version: number
}

export interface Repo {
  apps: App[]
  alerts: Alerts
  cluster: Cluster
  databases: Record<string, any>
  dns: Dns
  ingress: Ingress
  kms: Kms
  obj: Record<string, any>
  oidc: Oidc
  otomi: Otomi
  platformBackups: Record<string, any>
  smtp: Smtp
  users: User[]
  versions: Versions
  teamConfig: Record<string, TeamConfig>
}

export interface TeamConfig {
  apps: App[]
  backups: AplBackupResponse[]
  builds: AplBuildResponse[]
  codeRepos: AplCodeRepoResponse[]
  knowledgeBases: AplKnowledgeBaseResponse[]
  agents: AplAgentResponse[]
  netpols: AplNetpolResponse[]
  policies: AplPolicyResponse[]
  sealedsecrets: AplSecretResponse[]
  services: AplServiceResponse[]
  settings: AplTeamSettingsResponse
  workloads: AplWorkloadResponse[]
}
