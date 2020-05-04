import { AbilityBuilder, subject } from '@casl/ability'
import { AclAction, OpenApi, Schema, Property } from './api.d'

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
    })
    console.log(JSON.stringify(schemas))
    return schemas
  }

  getUserAbility(role: string, teamName: string) {
    // Convert specRules to format that CASL library understands
    const { can, build } = new AbilityBuilder()

    Object.keys(this.specRules).forEach((schemaName: string) => {
      const schema: Schema = this.specRules[schemaName]
      Object.keys(schema.properties).forEach((propertyName: string) => {
        const property: Property = schema.properties[propertyName]
        const actions: string[] = property['x-acl'][role]
        actions.forEach((action) => {
          if (action.endsWith('-all')) {
            can(action, schemaName, [propertyName])
          } else {
            // can perform action on its own resource
            can(action, schemaName, [propertyName], { teamId: teamName })
          }
        })
      })
    })

    return build()
  }

  isUserAuthorized = (action: AclAction, aclRole: string, teamName: string, schemaName: string, data: object) => {
    const ability = this.getUserAbility(aclRole, teamName)
    console.log(ability.rules)
    return ability.can(action, subject(schemaName, data))
  }
}
