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
