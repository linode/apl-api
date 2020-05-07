import { Ability, subject, RawRule } from '@casl/ability'
import set from 'lodash/set'
import has from 'lodash/has'
import get from 'lodash/get'
import { AclAction, OpenApi, Schema, Property, Session } from './api.d'

interface RawRules {
  [actionName: string]: { [schemaName: string]: { fields: string[]; conditions: object } }
}
export default class Authz {
  specRules

  constructor(apiSpec: OpenApi) {
    this.specRules = Authz.loadSpecRules(apiSpec)
  }

  static loadSpecRules(apiSpec: OpenApi) {
    // Load model wide permissions

    const schemas = apiSpec.components.schemas
    Object.keys(schemas).forEach((schemaName: string) => {
      const schema: Schema = schemas[schemaName]
      Object.keys(schema.properties).forEach((propertyName: string) => {
        const property: Property = schema.properties[propertyName]
        // Attribute wise permission overwrite model wise permissions
        property['x-acl'] = { ...schema['x-acl'], ...property['x-acl'] }
      })
      delete schema['x-acl']
    })
    // console.log(JSON.stringify(schemas))
    return schemas
  }

  getUserAbility(teamId, session: Session) {
    const specRules: RawRules = {}
    const canRules: RawRule[] = []

    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]
      Object.keys(schema.properties).forEach((propertyName: string) => {
        const property: Property = schema.properties[propertyName]
        const actions: string[] = get(property, `x-acl.${session.user.role}`, [])
        const ownershipCondition = () => {
          return teamId === session.user.teamId
        }
        actions.forEach((action) => {
          let conditions = ownershipCondition
          if (action.endsWith('-all')) conditions = null
          if (has(specRules, `${action}.${schemaName}.fields`)) specRules[action][schemaName].fields.push(propertyName)
          else set(specRules, `${action}.${schemaName}.fields`, [propertyName])
          // conditions - CASL requires that a tuple (action, schema) has the same conditions
          specRules[action][schemaName].conditions = conditions
        })
      })
    })

    Object.keys(specRules).forEach((action) => {
      const schemas = specRules[action]
      Object.keys(schemas).forEach((schemaName) => {
        const schema = schemas[schemaName]
        canRules.push({ action, subject: schemaName, fields: schema.fields, conditions: schema.conditions })
        // can(action, schemaName, schema.fields, schema.conditions)
      })
    })

    return new Ability(canRules)
  }

  printRules = (teamId: string, session: Session) => {
    const ability = this.getUserAbility(teamId, session)
    console.log(JSON.stringify(ability.rules))
  }

  isUserAuthorized = (action: AclAction, schemaName, session: Session, teamId: string, data: object): boolean => {
    let allowed = true
    const ability = this.getUserAbility(teamId, session)
    Object.keys(data).forEach((field) => {
      allowed = allowed && ability.can(action, schemaName, field)
    })
    return allowed
  }
}
