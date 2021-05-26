/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Ability, subject } from '@casl/ability'
import { set, has, get, isEmpty, pick, forIn } from 'lodash'
import {
  Acl,
  AclAction,
  OpenAPIDoc,
  Schema,
  User,
  TeamAuthz,
  PermissionSchema,
  TeamSelfService,
  UserAuthz,
} from './otomi-models'

import OtomiStack from './otomi-stack'

const allowedResourceActions = [
  'create',
  'create-any',
  'delete',
  'delete-any',
  'read',
  'read-any',
  'update',
  'update-any',
]
const allowedResourceCollectionActions = ['read-any']
const allowedAttributeActions = ['read', 'read-any', 'update', 'update-any']
const skipABACActions = ['create', 'read', 'delete']
const httpMethods = ['post', 'delete', 'get', 'patch', 'update']
interface RawRules {
  [actionName: string]: { [schemaName: string]: { fields: string[]; conditions: any } }
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

export function isValidAuthzSpec(apiDoc: OpenAPIDoc): boolean {
  const err: string[] = []

  if (isEmpty(apiDoc.security)) err.push(`Missing global security definition at 'security'`)

  forIn(apiDoc, (pathObj: any, pathName: string) => {
    Object.keys(pathObj).forEach((methodName) => {
      if (!httpMethods.includes(methodName)) return
      const methodObj = pathObj[methodName]

      // check if security is disabled for a given http method
      if (methodObj.security && methodObj.security.length === 0) return

      if (!methodObj['x-aclSchema']) err.push(`Missing x-aclSchema at 'paths.${pathName}.${methodName}'`)
    })
  })
  const { schemas } = apiDoc.components
  forIn(schemas, (schema: Schema, schemaName: string) => {
    console.debug(`Authz: loading rules for ${schemaName} schema`)
    // @ts-ignore
    // eslint-disable-next-line no-param-reassign
    if (!schema.type) schema.type = 'object'

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
      const props = schema.properties || schema['x-patternProperties']
      if (!props) {
        err.push(
          `schema does not contain properties nor x-patternProperties attribute, found at 'components.schemas.${schemaName}'`,
        )
        return
      }
      forIn(props, (prop, attributeName) => {
        if (prop['x-acl'])
          err.concat(
            validatePermissions(
              schema['x-acl'] || {},
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

  constructor(apiDoc: OpenAPIDoc) {
    this.specRules = Authz.loadSpecRules(apiDoc)
  }

  static loadSpecRules(apiDoc: OpenAPIDoc): any {
    // @ts-ignore
    const { schemas } = apiDoc.components

    Object.keys(schemas).forEach((schemaName: string) => {
      console.debug(`Authz: loading rules for ${schemaName} schema`)
      const schema: Schema = schemas[schemaName]

      if (schema.type === 'array') {
        return
      }
      const schemaAcl = {}
      Object.keys(schema['x-acl'] || {}).forEach((role) => {
        schemaAcl[role] = (schema['x-acl'] || {})[role].map((action: AclAction) => {
          if (action.endsWith('-any')) return action.slice(0, -4)
          return action
        })
      })
      Object.keys(schema.properties || {}).forEach((propertyName: string) => {
        const property = schema.properties![propertyName]
        // Attribute wise permission overwrite model wise permissions
        property['x-acl'] = { ...schemaAcl, ...property['x-acl'] }
      })
    })
    // console.log(JSON.stringify(schemas))
    return schemas
  }

  getAllowedAttributes = (action: string, schemaName, user: User, data: any): string[] => {
    const abac = this.getAttributeBasedAccessControl(user)
    const allowedAttributes: string[] = []
    Object.keys(data).forEach((attributeName) => {
      const isAuthorized = abac.can(action, schemaName, attributeName)
      if (isAuthorized) allowedAttributes.push(attributeName)
    })

    return allowedAttributes
  }

  getDataWithAllowedAttributes = (action: string, schemaName, user: User, data: any): any => {
    if (skipABACActions.includes(action)) return data

    const attr = this.getAllowedAttributes(action, schemaName, user, data)
    return pick(data, attr)
  }

  getResourceBasedAccessControl(user: User): Ability {
    const canRules: any[] = []
    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]
      user.roles.forEach((role) => {
        const actions: string[] = get(schema, `x-acl.${role}`, [])
        actions.forEach((action) => {
          if (action.endsWith('-any')) {
            canRules.push({ action: action.slice(0, -4), subject: schemaName })
          } else {
            user.teams.forEach((teamId) => {
              canRules.push({ action, subject: schemaName, conditions: { teamId: { $eq: teamId } } })
            })
          }
        })
      })
    })

    return new Ability(canRules)
  }

  getAttributeBasedAccessControl(user: User): Ability {
    const specRules: RawRules = {}

    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]
      if (!(schema.type === 'object' && schema.properties)) return
      user.roles.forEach((role) => {
        Object.keys(schema.properties as any).forEach((propertyName: string) => {
          const property = schema.properties![propertyName]
          const actions: string[] = get(property, `x-acl.${role}`, [])

          actions.forEach((actionName) => {
            if (!allowedAttributeActions.includes(actionName)) return

            let action = actionName
            if (actionName.endsWith('-any')) {
              action = action.slice(0, -4)
            }
            if (has(specRules, `${action}.${schemaName}.fields`))
              specRules[action][schemaName].fields.push(propertyName)
            else set(specRules, `${action}.${schemaName}.fields`, [propertyName])
          })
        })
      })
    })

    const canRules: any[] = []

    Object.keys(specRules).forEach((action) => {
      const schemas = specRules[action]
      Object.keys(schemas).forEach((schemaName) => {
        const schema = schemas[schemaName]
        canRules.push({ action, subject: schemaName, fields: schema.fields, conditions: schema.conditions })
      })
    })

    return new Ability(canRules)
  }

  validateWithRbac = (action: string, schemaName: string, user: User, teamId: string, data?: any): boolean => {
    const rbac = this.getResourceBasedAccessControl(user)
    const sub = subject(schemaName, { ...(data || {}), teamId })
    if (!rbac.can(action, sub)) {
      // console.debug(rbac.rules)
      console.debug(`Authz: not authorized (RBAC): ${action} ${schemaName}/${teamId}`)
      return false
    }

    return true
  }
}

export function getTeamAuthz(teamPermissions: TeamSelfService, schema: PermissionSchema): TeamAuthz {
  const authz: TeamAuthz = {} as TeamAuthz
  Object.keys(schema.properties).forEach((schemaName) => {
    const possiblePermissions = schema.properties[schemaName].items.enum
    set(authz, `deniedAttributes.${schemaName}`, [])
    authz.deniedAttributes[schemaName] = possiblePermissions.filter((name) => {
      const flags = get(teamPermissions, schemaName, [])
      return !flags.includes(name)
    })
    if (schemaName === 'Team') authz.deniedAttributes.Team.push('selfService')
  })
  return authz
}

export function getUserAuthz(teams: Array<string>, schema: PermissionSchema, otomi: OtomiStack): UserAuthz {
  const permissionMap: UserAuthz = {}

  teams.forEach((teamId) => {
    permissionMap[teamId] = getTeamAuthz(otomi.getTeamSelfServiceFlags(teamId), schema)
  })
  return permissionMap
}

export function getViolatedAttributes(deniedAttributePaths: Array<string>, data: any): Array<string> {
  const notAllowed: Array<string> = []
  deniedAttributePaths.forEach((path) => {
    if (has(data, path)) notAllowed.push(path)
  })
  return notAllowed
}

export function validateWithAbac(action: string, schemaName: string, user: User, teamId: string, body: any) {
  let violatedAttributes: Array<string> = []
  if (user.roles.includes('admin')) return violatedAttributes
  if (['create', 'update'].includes(action)) {
    const deniedAttributes = get(user.authz, `${teamId}.deniedAttributes.${schemaName}`, []) as Array<string>
    violatedAttributes = getViolatedAttributes(deniedAttributes, body)
  }
  return violatedAttributes
}
