import { Request } from 'express'

export interface OpenApiRequest extends Request {
  operationDoc: {
    responses: { '200'?: { content: { 'application/json': { schema: { $ref: string } } } } }
    security: any[]
  }
  apiDoc: OpenApi
  session: Session
}

type httpMethodType = 'delete' | 'read' | 'create' | 'update'
export interface OpenApi {
  components: {
    schemas: {
      [schemaName: string]: Schema
    }
  }
  paths?: {
    [path: string]: {
      [httpMethod: httpMethodType]: {
        'x-aclSchema'?: [string]
        security?: [string]
      }
    }
  }
  security?: string[]
}
export type SchemaType = 'object' | 'array'

export interface Schema {
  'x-acl'?: Acl
  type: SchemaType
  properties?: {
    [propertyName: string]: Property
  }
  items?: object
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

export interface Property {
  type: string
  'x-acl'?: Acl
}

export interface Session {
  user: {
    email: string
    teamId: string
    isAdmin: boolean
    role: string
  }
}
