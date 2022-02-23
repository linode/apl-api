import { Request } from 'express'
import { JSONSchema4 } from 'json-schema'
import { components, external, operations, paths } from './generated-schema'

export type App = components['schemas']['App']
export type AppList = components['schemas']['AppList']
export type Cluster = components['schemas']['Cluster']
export type Deployment = components['schemas']['Deployment']
export type Dns = Settings['dns']
export type Job = components['schemas']['Job']
export type Kubecfg = components['schemas']['Kubecfg']
export type Policies = Settings['policies']
export type Secret = components['schemas']['Secret'] & { teamId?: string }
export type Service = components['schemas']['Service']
export type Session = components['schemas']['Session']
export type Settings = components['schemas']['Settings']
export type Setting =
  | Settings['alerts']
  | Settings['azure']
  | Settings['dns']
  | Settings['home']
  | Settings['kms']
  | Settings['oidc']
  | Settings['otomi']
  | Settings['policies']
  | Settings['smtp']
export type Team = components['schemas']['Team']
export type TeamSelfService = components['schemas']['Team']['selfService']
export type User = components['schemas']['User']
export type UserAuthz = components['schemas']['User']['authz']
export type TeamAuthz = components['schemas']['TeamAuthz']

export interface OpenApiRequest extends Request {
  operationDoc: {
    responses: { '200'?: { content: { 'application/json': { schema: { $ref: string } } } } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    security: any[]
    operationId: string
  }
  apiDoc: OpenAPIDoc
  session: Session
  user?: User
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
  'x-readOnly'?: Acl
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
  Admin = 'admin',
  User = 'team',
}

export interface JWT {
  name: string
  email: string
  groups: string[]
  roles?: string[]
}

export interface OpenApiRequestExt extends OpenApiRequest, Session {
  user: User
  // Flag that indicates if experess-openapi middleware take up further authorization action
  isSecurityHandler?: boolean
}

export interface Core {
  k8s: any
  adminApps: any[]
  teamApps: any[]
  teamConfig: any
}
