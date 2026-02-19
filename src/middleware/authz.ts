import Authz from 'src/authz'
import { HttpError } from 'src/error'
import { OpenApiRequestExt } from 'src/otomi-models'

const HttpMethodMapping: Record<string, string> = {
  DELETE: 'delete',
  GET: 'read',
  PATCH: 'update',
  POST: 'create',
  PUT: 'update',
}

/**
 * Authorize a request based on RBAC rules.
 * Called by the security handler.
 * Throws HttpError if authorization fails.
 */
export function authorize(req: OpenApiRequestExt, authz: Authz): void {
  const { body, user } = req
  // express-openapi-validator stores path params in req.openapi.pathParams
  const teamId = req.openapi?.pathParams?.teamId ?? req.params?.teamId ?? req.query?.teamId ?? body?.teamId
  const action = HttpMethodMapping[req.method]

  // Get x-aclSchema from req.openapi.schema (set by express-openapi-validator)
  const schemaName = (req.openapi?.schema as any)?.['x-aclSchema'] || null

  // If there is no RBAC then we allow the request
  if (!schemaName) return

  // Initialize rules for the user
  authz.init(user)

  // Check RBAC permissions
  let valid
  const isTeamMember = !user.isPlatformAdmin && user.teams.includes(teamId)
  if (isTeamMember) {
    const permissionMap: Record<string, string> = {
      'read:Kubecfg': 'downloadKubeconfig',
      'read:DockerConfig': 'downloadDockerLogin',
      'create:Cloudtty': 'useCloudShell',
      'update:Policy': 'editSecurityPolicies',
      'create:Service': 'createServices',
    }
    const key = `${action}:${schemaName}`
    const permission = permissionMap[key]
    valid = permission ? authz.hasSelfService(teamId, permission) : authz.validateWithCasl(action, schemaName, teamId)
  } else {
    valid = authz.validateWithCasl(action, schemaName, teamId)
  }

  if (!valid) {
    throw new HttpError(403, `User not allowed to perform "${action}" on "${schemaName}" resource`)
  }

  // Validate properties from v2 request bodies that the user is not allowed their action on.
  // v2 bodies always wrap resource properties under a `spec` key.
  const isWriteOp = ['create', 'update'].includes(action)
  if (isWriteOp && req.path?.startsWith('/v2/') && req.body?.spec && !user.isPlatformAdmin) {
    const spec = req.body.spec as Record<string, unknown>
    for (const prop of Object.keys(spec)) {
      if (!authz.validatePropertyWithCasl(action, schemaName, prop, teamId)) {
        throw new HttpError(403, `User not allowed to perform "${action}" on "${schemaName}" resource`)
      }
    }
  }
}
