import { Request } from 'express'

export interface OpenApiRequest extends Request {
  operationDoc: { responses: { '200'?: { content: { 'application/json': { schema: { $ref: string } } } } } }
  apiDoc: object
}

export interface OpenApi {
  components: {
    schemas: {
      [schemaName: string]: Schema
    }
  }
}
export type SchemaType = 'object' | 'array'

export interface Schema {
  'x-acl'?: Acl
  type: SchemaType
  properties?: {
    [propertyName: string]: Property
  }
  items?: object
}

export interface Acl {
  team?: AclAction[]
  admin?: AclAction[]
}

export type AclAction =
  | 'create'
  | 'create-all'
  | 'delete'
  | 'delete-all'
  | 'get'
  | 'get-all'
  | 'patch'
  | 'patch-all'
  | 'put'
  | 'put-all'

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
