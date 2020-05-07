import { AbilityBuilder, subject } from '@casl/ability'
import set from 'lodash/set'
import has from 'lodash/has'
import { AclAction, OpenApi, Schema, Property } from './api.d'

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

  getUserAbility(role: string, teamName: string) {
    // Convert specRules to format that CASL library understands
    const { can, cannot, build } = new AbilityBuilder()

    const rules: RawRules = {}

    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]
      Object.keys(schema.properties).forEach((propertyName: string) => {
        const property: Property = schema.properties[propertyName]
        const actions: string[] = property['x-acl'][role]
        const possibleActions = ['create', 'update', 'delete', 'get']
        possibleActions.forEach((action) => {
          if (!actions.includes(action)) {
            cannot(action, schemaName, propertyName)
            return
          }

          let conditions = { teamId: teamName }
          if (action.endsWith('-all')) conditions = null
          if (has(rules, `${action}.${schemaName}.fields`)) rules[action][schemaName].fields.push(propertyName)
          else set(rules, `${action}.${schemaName}.fields`, [propertyName])
          // conditions - CASL requires that a tuple (action, schema) has the same conditions
          rules[action][schemaName].conditions = conditions
        })
      })
    })

    Object.keys(rules).forEach((action) => {
      const schemas = rules[action]
      Object.keys(schemas).forEach((schemaName) => {
        const schema = schemas[schemaName]
        can(action, schemaName, schema.fields, schema.conditions)
      })
    })

    return build()
  }

  printRules = (aclRole: string, teamName: string) => {
    const ability = this.getUserAbility(aclRole, teamName)
    console.log(JSON.stringify(ability.rules))
  }

  relevantRuleFor = (action: AclAction, aclRole: string, teamName: string, schemaName: string, data: object) => {
    const ability = this.getUserAbility(aclRole, teamName)
    return ability.relevantRuleFor(action, subject(schemaName, data))
  }

  isUserAuthorized = (action: AclAction, aclRole: string, teamName: string, schemaName: string, data: object) => {
    const ability = this.getUserAbility(aclRole, teamName)
    const subjectObj = subject(schemaName, data)
    console.log(ability.relevantRuleFor(action, subjectObj))
    return ability.can(action, subjectObj)
  }
}
