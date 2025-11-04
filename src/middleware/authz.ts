/* eslint-disable no-param-reassign */
import { debug } from 'console'
import { RequestHandler } from 'express'
import { find } from 'lodash'
import get from 'lodash/get'
import Authz, { getTeamSelfServiceAuthz } from 'src/authz'
import { HttpError } from 'src/error'
import { OpenApiRequestExt } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { RepoService } from '../services/RepoService'
import { getSessionStack } from './session'

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

export function authorize(req: OpenApiRequestExt, res, next, authz: Authz, repoService: RepoService): RequestHandler {
  const { params, query, body, user } = req
  const teamId = params?.teamId ?? query?.teamId ?? body?.teamId
  const action = HttpMethodMapping[req.method]
  const schema: string = get(req, 'operationDoc.x-aclSchema', '')
  const schemaName = schema.split('/').pop() || null
  // If there is no RBAC then we bail
  if (!schemaName) return next()

  // init rules for the user
  authz.init(user)

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
  } else valid = authz.validateWithCasl(action, schemaName, teamId)

  if (!valid) {
    throw new HttpError(403, `User not allowed to perform "${action}" on "${schemaName}" resource`)
  }

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
  const teamSpecificCollections = ['builds', 'services', 'workloads', 'netpols', 'policies', 'sealedSecrets'] // <-- These are fetched per team

  const selector = renameKeys(req.params)
  const collectionId = schemaToRepoMap[schemaName]
  if (collectionId && ['create', 'update'].includes(action)) {
    let dataOrig = get(
      req,
      `apiDoc.components.schemas.TeamSelfService.properties.${schemaName.toLowerCase()}.x-allow-values`,
      {},
    )

    if (action === 'update') {
      try {
        let collection
        if (teamSpecificCollections.includes(collectionId)) {
          collection = repoService.getTeamConfigService(teamId).getCollection(collectionId)
        } else {
          collection = repoService.getCollection(collectionId)
        }
        dataOrig = find(collection, selector) || {}
      } catch (error) {
        debug('Error in authzMiddleware', error)
      }
    }

    const violatedAttributes = authz.validateWithAbac(action, schemaName, teamId, req.body, dataOrig)
    if (violatedAttributes.length > 0) {
      return res.status(403).send({
        authz: false,
        message: `User not allowed to modify the following attributes ${violatedAttributes}" of ${schemaName}" resource`,
      })
    }
  }
  // TODO: enable next part later:
  //filter response based on abac
  // res.json = wrapResponse(
  //   (obj: Record<string, any>) => authz.filterWithAbac(schemaName, teamId, obj),
  //   res.json.bind(res),
  // )

  return next()
}
export function authzMiddleware(authz: Authz): RequestHandler {
  return async function nextHandler(req: OpenApiRequestExt, res, next): Promise<any> {
    if (req.user) {
      req.isSecurityHandler = true
    } else {
      return next()
    }
    try {
      const otomi: OtomiStack = await getSessionStack(req.user.email)
      // Now we call the new helper which derives authz based on the new selfService.teamMembers flags.
      req.user.authz = getTeamSelfServiceAuthz(req.user.teams, otomi)
      return authorize(req, res, next, authz, otomi.repoService)
    } catch (error) {
      return next(error)
    }
  }
}
