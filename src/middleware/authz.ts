/* eslint-disable no-param-reassign */
import { getSpec } from 'src/app'
import { debug } from 'console'
import { find } from 'lodash'
import get from 'lodash/get'
import Authz from 'src/authz'
import { HttpError } from 'src/error'
import { OpenApiRequestExt } from 'src/otomi-models'
import { RepoService } from '../services/RepoService'

const HttpMethodMapping: Record<string, string> = {
  DELETE: 'delete',
  GET: 'read',
  PATCH: 'update',
  POST: 'create',
  PUT: 'update',
}

function renameKeys(obj: Record<string, any>) {
  const newKeys = {
    serviceId: 'id',
    secretId: 'id',
  }
  if (Object.keys(obj).length === 1 && 'teamId' in obj) return { id: obj.teamId }
  const keyValues = Object.keys(obj).map((key) => {
    const newKey = newKeys[key] || key
    return { [newKey]: obj[key] }
  })
  return Object.assign({}, ...keyValues)
}

// const badCode = (code) => code >= 300 || code < 200
// const wrapResponse = (filter, orig) => {
//   return function (obj) {
//     if (badCode(this.statusCode)) return orig(obj)
//     const ret = filter(obj)
//     return orig(ret)
//   }
// }

/**
 * Authorize a request based on RBAC and ABAC rules.
 * Called by the security handler.
 * Throws HttpError if authorization fails.
 */
export function authorize(req: OpenApiRequestExt, authz: Authz, repoService: RepoService): void {
  const { body, user } = req
  // express-openapi-validator stores path params in req.openapi.pathParams
  const teamId = req.openapi?.pathParams?.teamId ?? req.params?.teamId ?? req.query?.teamId ?? body?.teamId
  const action = HttpMethodMapping[req.method]

  // Get x-aclSchema from req.openapi.schema (set by express-openapi-validator)
  const schemaName = (req.openapi?.schema as any)?.['x-aclSchema'] || null

  // If there is no RBAC then we allow the request
  if (!schemaName) return

  const apiSpec = getSpec().spec

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

  // Check ABAC permissions for create/update operations
  const schemaToRepoMap: Record<string, string> = {
    Service: 'services',
    Team: 'teamConfig',
    App: 'apps',
    Build: 'builds',
    Workload: 'workloads',
    Settings: 'otomi',
    Netpol: 'netpols',
    Policy: 'policies',
    SealedSecret: 'sealedSecrets',
  }
  const teamSpecificCollections = ['builds', 'services', 'workloads', 'netpols', 'policies', 'sealedSecrets']

  //TODO lookup if we can remove this
  const collectionId = schemaToRepoMap[schemaName]
  if (collectionId && ['create', 'update'].includes(action)) {
    // Look up x-allow-values from the API spec for ABAC validation
    let dataOrig = get(
      apiSpec,
      `components.schemas.TeamSelfService.properties.${schemaName.toLowerCase()}.x-allow-values`,
      {},
    )

    if (action === 'update') {
      try {
        const pathParams = req.openapi?.pathParams ?? req.params
        const selector = renameKeys(pathParams)
        let collection
        if (teamSpecificCollections.includes(collectionId)) {
          collection = repoService.getTeamConfigService(teamId).getCollection(collectionId)
        } else {
          collection = repoService.getCollection(collectionId)
        }
        dataOrig = find(collection, selector) || {}
      } catch (error) {
        debug('Error in authorize', error)
      }
    }

    const violatedAttributes = authz.validateWithAbac(action, schemaName, teamId, req.body, dataOrig)
    if (violatedAttributes.length > 0) {
      throw new HttpError(
        403,
        `User not allowed to modify the following attributes: ${violatedAttributes.join(', ')} of ${schemaName} resource`,
      )
    }
  }
}
