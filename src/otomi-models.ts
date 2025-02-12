import { Request } from 'express'
import { JSONSchema4 } from 'json-schema'
import { components, external, operations, paths } from 'src/generated-schema'
import OtomiStack from 'src/otomi-stack'
export type App = components['schemas']['App']
export type AppList = components['schemas']['AppList']
export type Backup = components['schemas']['Backup']
export type Kubecfg = components['schemas']['Kubecfg']
export type K8sService = components['schemas']['K8sService']
export type Netpol = components['schemas']['Netpol']
export type Secret = components['schemas']['Secret'] & { teamId?: string }
export type SealedSecret = components['schemas']['SealedSecret'] & { teamId?: string }
export type SealedSecretsKeys = components['schemas']['SealedSecretsKeys']
export type K8sSecret = components['schemas']['K8sSecret']
export type Service = components['schemas']['Service']
export type Session = components['schemas']['Session']
export type ObjWizard = components['schemas']['ObjWizard']
export type Settings = components['schemas']['Settings']
export type SettingsInfo = components['schemas']['SettingsInfo']
export type TestRepoConnect = components['schemas']['TestRepoConnect']
export type Team = components['schemas']['Team']
export type TeamSelfService = components['schemas']['Team']['selfService']
export type SessionUser = components['schemas']['SessionUser']
export type UserAuthz = components['schemas']['SessionUser']['authz']
export type Workload = components['schemas']['Workload']
export type WorkloadValues = components['schemas']['WorkloadValues']
export type User = components['schemas']['User']
export type Project = components['schemas']['Project']
export type Coderepo = components['schemas']['Coderepo']
export type Build = components['schemas']['Build']
export type Policy = components['schemas']['Policy']
export type Policies = components['schemas']['Policies']
export type Cloudtty = components['schemas']['Cloudtty']
export type TeamAuthz = components['schemas']['TeamAuthz']
// Derived setting models
export type Alerts = Settings['alerts']
export type Cluster = Settings['cluster']
export type Dns = Settings['dns']
export type Kms = Settings['kms']
export type Oidc = Settings['oidc']
export type Otomi = Settings['otomi']

export interface OpenApiRequest extends Request {
  operationDoc: {
    responses: { '200'?: { content: { 'application/json': { schema: { $ref: string } } } } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    security: any[]
    operationId: string
  }
  apiDoc: OpenAPIDoc
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
