import { set } from 'lodash'
import { PermissionSchema } from './otomi-models'
import OtomiStack from './otomi-stack'

interface PermissionMap {
  [teamId: string]: {
    [schameName: string]: Array<string>
  }
}

export default function getPermissionMap(
  teams: Array<string>,
  schema: PermissionSchema,
  otomi: OtomiStack,
): PermissionMap {
  const permissionMap: PermissionMap = {}

  teams.forEach((teamName) => {
    Object.keys(schema.properties).forEach((schemaName) => {
      const possiblePermissions = schema.properties[schemaName].items.enum
      const permissions = otomi.getTeamPermissions(teamName)
      const attr = possiblePermissions.filter((name) => !permissions[schemaName].includes(name))
      set(permissionMap, `${teamName}.${schemaName}`, attr)
    })
  })
  return permissionMap
}
