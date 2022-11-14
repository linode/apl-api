/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Ability, Subject, subject } from '@casl/ability'
import Debug from 'debug'
import { each, forIn, get, isEmpty, isEqual, omit, set } from 'lodash'
import { Acl, AclAction, OpenAPIDoc, PermissionSchema, Schema, TeamAuthz, User, UserAuthz } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { extract, flattenObject } from 'src/utils'

const debug = Debug('otomi:authz')

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
const allowedAttributeCrudActions = ['read', 'update']
const httpMethods = ['post', 'delete', 'get', 'patch', 'update']

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

export const getAclProps = (schema: Schema) =>
  Object.keys(
    flattenObject(
      extract(schema, (_: any, i: string, p: string) => {
        return p !== '' && i === 'x-acl' ? true : undefined
      }),
    ),
  )

export function isValidAuthzSpec(apiDoc: OpenAPIDoc): boolean {
  const err: string[] = []

  if (isEmpty(apiDoc.security)) err.push(`Missing global security definition at 'security'`)

  forIn(apiDoc, (pathObj: Record<string, any>, pathName: string) => {
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
    debug(`loading rules for ${schemaName} schema`)
    // @ts-ignore
    // eslint-disable-next-line no-param-reassign

    if (schema.type === 'array') {
      if (schema['x-acl']) {
        err.concat(
          validatePermissions(
            schema['x-acl'],
            allowedResourceCollectionActions,
            `components.schemas.${schemaName}.x-acl`,
          ),
        )
      }
      return
    }

    if (schema.type === 'object') {
      if (schema['x-acl']) {
        err.concat(
          validatePermissions(schema['x-acl'], allowedResourceActions, `components.schemas.${schemaName}.x-acl`),
        )
      }
      const props = schema.properties
      if (schema.nullable && !props) return
      forIn(props, (prop, attributeName) => {
        if (prop['x-acl']) {
          err.concat(
            validatePermissions(
              schema['x-acl'] || {},
              allowedAttributeActions,
              `${schemaName}.properties${attributeName}.x-acl`,
            ),
          )
        }
      })
    }
  })
  if (err.length !== 0) {
    debug('config validation errors:')
    err.forEach((error) => debug(error))
    return false
  }
  debug('config validation succeeded')
  return true
}

export const getAclHolder = (schema: Schema): Schema | undefined => {
  if (schema['x-acl']) return schema
  // we support composition of schemas througout, so we may also expect the following
  return schema.allOf && schema.allOf.find((o) => !!o['x-acl'])
}

export const loadSpecRules = (apiDoc: OpenAPIDoc): any => {
  const { schemas } = apiDoc.components

  Object.keys(schemas).forEach((schemaName: string) => {
    debug(`loading rules for ${schemaName} schema`)
    const schema: Schema = schemas[schemaName]

    if (schema.type === 'array') return

    const schemaAcl = {}
    Object.keys(schema['x-acl'] || {}).forEach((role) => {
      schemaAcl[role] = schema['x-acl']![role].map((action: AclAction) => {
        if (action.endsWith('-any')) return action.slice(0, -4)
        return action
      })
    })
  })
  return schemas
}

export default class Authz {
  user: User

  specRules: Record<string, Schema>

  rbac: Ability

  constructor(apiDoc: OpenAPIDoc) {
    this.specRules = loadSpecRules(apiDoc)
  }

  init(user: User) {
    this.user = user
    const canRules: any[] = []
    const createRule =
      (schemaName, prop = '', inverted = false) =>
      (action) => {
        const sub = `${schemaName}${prop ? `.${prop}` : ''}`
        debug(`creating rules for subject ${sub}, inverted: ${inverted}`)
        if (action.endsWith('-any')) canRules.push({ action: action.slice(0, -4), inverted, subject: sub })
        else {
          user.teams.forEach((teamId) => {
            canRules.push({
              action,
              inverted,
              subject: sub,
              conditions: { teamId },
            })
          })
        }
      }
    const createRules = (schemaName, schema: Schema) => {
      user.roles.forEach((role) => {
        const aclHolder = getAclHolder(schema)
        const actions: string[] = get(aclHolder, `x-acl.${role}`, [])
        actions.forEach(createRule(schemaName))
        each(schema.properties, (obj, prop) => {
          const _aclHolder = getAclHolder(obj as Schema)
          if (!_aclHolder) return
          const _actions: string[] = get(_aclHolder, `x-acl.${role}`, [])
          _actions.forEach(createRule(schemaName, prop))
          // create explicit deny rules as well for all crud actions NOT given on props
          // actions like *-any imply that * is also allowed, so exclude those from inversion
          const normalized = _actions.map((a) => (a.includes('-any') ? a.slice(0, -4) : a))
          allowedAttributeCrudActions
            .filter((a) => {
              const cond = !(normalized.includes(a) || _actions.includes(`${a}-any`))
              return cond
            })
            .forEach(createRule(schemaName, prop, true))
          if (obj.properties) createRules(`${schemaName}.${prop}`, obj)
        })
      })
    }
    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]
      createRules(schemaName, schema)
    })

    this.rbac = new Ability(canRules)
    return this
  }

  validateWithCasl = (action: string, schemaName: string, teamId: string): boolean => {
    const sub: Subject = subject(schemaName, { teamId })
    debug(`validateWithCasl: `, sub)
    const iCan = this.rbac.can(action, sub)
    if (!iCan) debug(`Authz: not authorized (RBAC): ${action} ${schemaName}${teamId ? `/${teamId}` : ''}`)
    return iCan
  }

  validateWithAbac = (action: string, schemaName: string, teamId: string, body?: any, dataOrig?: any): string[] => {
    const violatedAttributes: string[] = []
    if (this.user.roles.includes('admin')) return violatedAttributes

    if (!['create', 'update'].includes(action))
      throw new Error('validateWithAbac should only be used for mutating actions')
    const deniedRoleAttributes = this.getAbacDenied(action, schemaName, teamId)
    // check if we are denied any attributes by role
    // also check if we are denied by lack of self service
    const deniedSelfServiceAttributes = get(
      this.user.authz,
      `${teamId}.deniedAttributes.${schemaName.toLowerCase()}`,
      [],
    ) as Array<string>
    // the two above denied lists should be mutually exclusive, because a schema design should not
    // have have both self service as well as acl set for the same property, so we can merge the result
    const deniedAttributes = [...deniedRoleAttributes, ...deniedSelfServiceAttributes]

    deniedAttributes.forEach((path) => {
      const val = get(body, path)
      const origVal = get(dataOrig, path)
      // undefined value expected for forbidden props, just put back before save
      if (val === undefined) set(body, path, origVal)
      // value provided which shouldn't happen
      else if (!isEqual(val, origVal)) violatedAttributes.push(path)
    })
    return violatedAttributes
  }

  getAbacDenied = (action: string, schemaName: string, teamId: string): string[] => {
    const schema = this.specRules[schemaName]
    const aclProps = getAclProps(schema)
    const violatedAttributes: Array<string> = aclProps.filter(
      (prop) => !this.validateWithCasl(action, `${schemaName}.${prop}`, teamId),
    )
    return violatedAttributes
  }

  filterWithAbac = (schemaName: string, teamId: string, body: Record<string, any>): any => {
    if (typeof body !== 'object') return body
    const deniedRoleAttributes = this.getAbacDenied('read', schemaName, teamId)
    const ret = (body.length !== undefined ? body : [body]).map((obj) => omit(obj, deniedRoleAttributes))
    return body.length !== undefined ? ret : ret[0]
  }

  hasSelfService = (teamId: string, schema, attribute: string) => {
    const deniedAttributes = get(this.user.authz, `${teamId}.deniedAttributes.${schema}`, []) as Array<string>
    if (deniedAttributes.includes(attribute)) return false
    return true
  }
}

export const getTeamSelfServiceAuthz = (
  teams: Array<string>,
  schema: PermissionSchema,
  otomi: OtomiStack,
): UserAuthz => {
  const permissionMap: UserAuthz = {}

  teams.forEach((teamId) => {
    const authz: TeamAuthz = {} as TeamAuthz
    Object.keys(schema.properties).forEach((propName) => {
      const possiblePermissions = schema.properties[propName].items.enum
      set(authz, `deniedAttributes.${propName}`, [])
      authz.deniedAttributes[propName] = possiblePermissions.filter((name) => {
        const flags = get(otomi.getTeamSelfServiceFlags(teamId), propName, [])
        return !flags.includes(name)
      })
      if (propName === 'team') authz.deniedAttributes.team.push('selfService')
    })
    permissionMap[teamId] = authz
  })
  return permissionMap
}
