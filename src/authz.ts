import { Ability, RawRule, subject } from '@casl/ability'
import set from 'lodash/set'
import has from 'lodash/has'
import get from 'lodash/get'

import isEmpty from 'lodash/isEmpty'
import { Acl, OpenApi, Schema, Property, Session } from './api.d'

const allowedResourceActions = [
  'get',
  'get-all',
  'patch',
  'patch-all',
  'put',
  'put-all',
  'delete',
  'delete-all',
  'create',
  'create-all',
]
const allowedResourceCollectionActions = ['get-all']
const allowedAttributeActions = ['get', 'get-all', 'patch', 'patch-all', 'put', 'put-all']
const skipABACActions = ['post', 'get', 'delete']

interface RawRules {
  [actionName: string]: { [schemaName: string]: { fields: string[]; conditions: object } }
}

function validatePermissions(acl: Acl, allowedPermissions: string[], path: string): string[] {
  const err: string[] = []
  Object.keys(acl).forEach((role) => {
    acl[role].forEach((permission) => {
      if (!allowedPermissions.includes(permission))
        err.push(`the resource permission supports only [${allowedPermissions}], found at ${path}`)
    })
  })

  return err
}

export function isValidAuthzSpec(apiSpec: OpenApi): boolean {
  const err: string[] = []

  if (isEmpty(apiSpec.security)) err.push(`Missing global security definition at 'security'`)

  Object.keys(apiSpec.paths).forEach((pathName: string) => {
    const pathObj = apiSpec.paths[pathName]
    Object.keys(pathObj).forEach((methodName) => {
      const methodObj = pathObj[methodName]

      // check if security is disabled for a given http method
      if (methodObj.security && methodObj.security.length === 0) return

      if (!methodObj['x-aclSchema']) err.push(`Missing x-aclSchema at 'paths.${pathName}.${methodName}'`)
    })
  })

  const schemas = apiSpec.components.schemas
  Object.keys(schemas).forEach((schemaName: string) => {
    console.debug(`Authz: loading rules for ${schemaName} schema`)
    const schema: Schema = schemas[schemaName]
    if (!schema['x-acl'])
      err.push(`schema does not contain x-acl attribute, found at 'components.schemas.${schemaName}'`)

    if (schema.type !== 'object' && schema.type !== 'array') {
      err.push(`schema type ${schema.type} is not supported, found at 'components.schemas.${schemaName}'`)
      return
    }

    if (schema.type === 'array') {
      if (schema['x-acl'])
        err.concat(
          validatePermissions(
            schema['x-acl'],
            allowedResourceCollectionActions,
            `components.schemas.${schemaName}.x-acl`,
          ),
        )
      return
    }

    if (schema.type === 'object') {
      if (schema['x-acl'])
        err.concat(
          validatePermissions(schema['x-acl'], allowedResourceActions, `components.schemas.${schemaName}.x-acl`),
        )

      if (!schema.properties) {
        err.push(`schema does not contain properties attribute, found at 'components.schemas.${schemaName}'`)
        return
      }
      Object.keys(schema.properties).forEach((attributeName) => {
        const property = schema.properties[attributeName]
        if (property['x-acl'])
          err.concat(
            validatePermissions(
              schema['x-acl'],
              allowedAttributeActions,
              `${schemaName}.properties${attributeName}.x-acl`,
            ),
          )
      })
    }
  })
  if (err.length !== 0) {
    console.log('Authz config validation errors:')
    err.forEach((error) => console.error(error))
    return false
  }
  console.log('Authz config validation succeeded')
  return true
}
export default class Authz {
  specRules

  constructor(apiSpec: OpenApi) {
    this.specRules = Authz.loadSpecRules(apiSpec)
  }

  static loadSpecRules(apiSpec: OpenApi) {
    const schemas = apiSpec.components.schemas

    Object.keys(schemas).forEach((schemaName: string) => {
      console.debug(`Authz: loading rules for ${schemaName} schema`)
      const schema: Schema = schemas[schemaName]

      if (schema.type === 'array') {
        // No ABAC for array
        return
      }

      Object.keys(schema.properties).forEach((propertyName: string) => {
        const property: Property = schema.properties[propertyName]
        // Attribute wise permission overwrite model wise permissions
        property['x-acl'] = { ...schema['x-acl'], ...property['x-acl'] }
      })
    })
    // console.log(JSON.stringify(schemas))
    return schemas
  }

  getResourceBasedAccessControl(session: Session) {
    const canRules: RawRule[] = []
    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]

      const actions: string[] = get(schema, `x-acl.${session.user.role}`, [])
      actions.forEach((action) => {
        if (action.endsWith('-all')) {
          canRules.push({ action: action.slice(0, -4), subject: schemaName })
        } else canRules.push({ action, subject: schemaName, conditions: { teamId: { $eq: session.user.teamId } } })
      })
    })

    // console.log(JSON.stringify(canRules))
    return new Ability(canRules)
  }

  getAttributeBasedAccessControl(session: Session) {
    const specRules: RawRules = {}

    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]
      if (!(schema.type === 'object' && schema.properties)) return

      Object.keys(schema.properties).forEach((propertyName: string) => {
        const property: Property = schema.properties[propertyName]
        const actions: string[] = get(property, `x-acl.${session.user.role}`, [])

        actions.forEach((actionName) => {
          if (!allowedAttributeActions.includes(actionName)) return

          let action = actionName
          if (actionName.endsWith('-all')) {
            action = action.slice(0, -4)
          }
          if (has(specRules, `${action}.${schemaName}.fields`)) specRules[action][schemaName].fields.push(propertyName)
          else set(specRules, `${action}.${schemaName}.fields`, [propertyName])
        })
      })
    })

    const canRules: RawRule[] = []

    Object.keys(specRules).forEach((action) => {
      const schemas = specRules[action]
      Object.keys(schemas).forEach((schemaName) => {
        const schema = schemas[schemaName]
        canRules.push({ action, subject: schemaName, fields: schema.fields, conditions: schema.conditions })
      })
    })

    return new Ability(canRules)
  }

  isUserAuthorized = (action: string, schemaName, session: Session, teamId: string, data: object): boolean => {
    const rbac = this.getResourceBasedAccessControl(session)
    const sub = subject(schemaName, { ...data, teamId })
    if (!rbac.can(action, sub)) {
      // console.debug(rbac.rules)
      console.debug(`Authz: not authorized (RBAC): ${action} ${schemaName}/${teamId}`)
      return false
    }

    if (skipABACActions.includes(action)) return true

    // ABAC
    const abac = this.getAttributeBasedAccessControl(session)
    let allowed = true
    const notAllowedAttributes: string[] = []
    Object.keys(data).forEach((attributeName) => {
      const isAuthorized = abac.can(action, schemaName, attributeName)
      if (!isAuthorized) notAllowedAttributes.push(attributeName)
      allowed = allowed && isAuthorized
    })
    if (!allowed) {
      console.debug(
        `Authz: not authorized (ABAC): ${action} ${schemaName}/${teamId}, failing attributes: ${notAllowedAttributes}`,
      )
      // console.debug(`Authz: not authorized (ABAC): ${JSON.stringify(abac.rules)}`)
    }
    return allowed
  }
}
