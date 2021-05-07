import { Request } from 'express'
import { components } from './generated-schema'

export type Cluster = components['schemas']['Cluster']
export type Deployment = components['schemas']['Deployment']
export type Kubecfg = components['schemas']['Kubecfg']
export type Secret = components['schemas']['Secret'] & { teamId?: string }
export type Service = components['schemas']['Service']
export type Session = components['schemas']['Session']
export type Settings = components['schemas']['Settings']
export type Team = components['schemas']['Team']
export type User = components['schemas']['User']

export interface OpenApiRequest extends Request {
  operationDoc: {
    responses: { '200'?: { content: { 'application/json': { schema: { $ref: string } } } } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    security: any[]
  }
  apiDoc: OpenAPIDoc
  session: Session
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
export interface Property {
  type: string
  'x-acl'?: Acl
}

export type SchemaType = 'object' | 'array'

export interface Schema {
  'x-acl'?: Acl
  type: SchemaType
  properties?: {
    [propertyName: string]: Property
  }
  items?: any
  required?: string[]
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

// eslint-disable-next-line no-shadow
export enum SessionRole {
  Admin = 'admin',
  // eslint-disable-next-line no-shadow
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
}

export interface Core {
  teamConfig: {
    services: any[]
    teams: Team[]
  }
}
