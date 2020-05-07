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

export interface Schema {
  'x-acl'?: Acl
  properties: {
    [propertyName: string]: Property
  }
}

export interface Acl {
  team?: AclAction[]
  admin?: AclAction[]
}

export type AclAction = 'delete' | 'create' | 'get' | 'update'

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
