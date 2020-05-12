import { Ability, RawRule } from '@casl/ability'
import set from 'lodash/set'
import has from 'lodash/has'
import get from 'lodash/get'

import { OpenApi, Schema, Property, Session } from './api.d'

interface RawRules {
  [actionName: string]: { [schemaName: string]: { fields: string[]; conditions: object } }
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
      if (!schema['x-acl']) {
        console.warn(`Authz: the schema ${schemaName} does not contain x-acl attribute`)
        return
      }
      if (schema.type !== 'object' && schema.type !== 'array') {
        console.warn(`Authz: the schema type ${schema.type} is not supported. Found at ${schemaName}.type`)
        return
      }

      if (schema.type === 'array') {
        Object.keys(schema['x-acl']).forEach((role) => {
          if (JSON.stringify(schema['x-acl'][role]) !== JSON.stringify(['get-all']))
            console.warn(
              `Authz: the schema type ${schema.type} supports only 'get-all' permission. Found at ${schemaName}.x-acl`,
            )
        })
        // No ABAC for collections
        return
      }

      if (!schema.properties) {
        console.debug(`Authz: the ${schemaName} schema does not contain properties`)
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

  getResourceBasedAccessControl(teamId, session: Session) {
    const canRules: RawRule[] = []
    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]
      const ownershipCondition = () => {
        console.debug(`Checking ownership session(${session.user.teamId}), resource(${teamId})`)
        return teamId === session.user.teamId
      }
      const actions: string[] = get(schema, `x-acl.${session.user.role}`, [])
      actions.forEach((action) => {
        if (action.endsWith('-all')) {
          canRules.push({ action: action.slice(0, -4), subject: schemaName })
        } else canRules.push({ action, subject: schemaName, conditions: ownershipCondition })
      })
    })

    console.log(JSON.stringify(canRules))
    return new Ability(canRules)
  }

  getResourceAttributeBasedAccessControl(teamId: string, session: Session) {
    const specRules: RawRules = {}

    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]
      if (!(schema.type === 'object' && schema.properties)) return

      Object.keys(schema.properties).forEach((propertyName: string) => {
        const property: Property = schema.properties[propertyName]
        const actions: string[] = get(property, `x-acl.${session.user.role}`, [])
        const ownershipCondition = () => {
          return teamId === session.user.teamId
        }
        actions.forEach((action) => {
          if (has(specRules, `${action}.${schemaName}.fields`)) specRules[action][schemaName].fields.push(propertyName)
          else set(specRules, `${action}.${schemaName}.fields`, [propertyName])
          // conditions - CASL requires that a tuple (action, schema) has the same conditions
          if (action.endsWith('-all')) specRules[action][schemaName].conditions = null
          else specRules[action][schemaName].conditions = ownershipCondition
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

  printRules = (teamId: string, session: Session) => {
    const ability = this.getResourceAttributeBasedAccessControl(teamId, session)
    console.log(JSON.stringify(ability.rules))
  }

  isUserAuthorized = (action: string, schemaName, session: Session, teamId: string, data: object): boolean => {
    const rbac = this.getResourceBasedAccessControl(teamId, session)
    if (!rbac.can(action, schemaName)) {
      // console.debug(rbac.rules)
      console.debug(`Authz: not authorized (RBAC): ${action} ${schemaName}/${teamId}`)
      return false
    }

    // ABAC for operation GET is not supported
    if (action === 'get') return true

    // ABAC
    const abac = this.getResourceAttributeBasedAccessControl(teamId, session)
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
