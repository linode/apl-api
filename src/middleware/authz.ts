/* eslint-disable no-param-reassign */
import { RequestHandler } from 'express'
import get from 'lodash/get'
import Authz, { getTeamSelfServiceAuthz } from 'src/authz'
import { OpenApiRequestExt, PermissionSchema, TeamSelfService } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { cleanEnv } from 'src/validators'
import { getSessionStack } from './session'
import { RepoService } from '../services/RepoService'
import { debug } from 'console'
import { find } from 'lodash'

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
  const {
    params: { teamId },
    body,
    user,
  } = req
  const action = HttpMethodMapping[req.method]
  const schema: string = get(req, 'operationDoc.x-aclSchema', '')
  const schemaName = schema.split('/').pop() || null
  // If there is no RBAC then we bail
  if (!schemaName) return next()

  // init rules for the user
  authz.init(user)

  let valid
  if (action === 'read' && schemaName === 'Kubecfg')
    valid = authz.hasSelfService(teamId, 'access', 'downloadKubeConfig')
  else if (action === 'read' && schemaName === 'DockerConfig')
    valid = authz.hasSelfService(teamId, 'access', 'downloadDockerConfig')
  else if (action === 'create' && schemaName === 'Cloudtty')
    valid = authz.hasSelfService(body.teamId, 'access', 'shell')
  else valid = authz.validateWithCasl(action, schemaName, teamId)
  const env = cleanEnv({})
  // TODO: Debug purpose only for removal of license
  if (!env.isDev) {
    if (!valid) {
      return res
        .status(403)
        .send({ authz: false, message: `User not allowed to perform "${action}" on "${schemaName}" resource` })
    }
  }

  const schemaToRepoMap: Record<string, string> = {
    Service: 'services',
    Team: 'teamConfig',
  }

  const selector = renameKeys(req.params)
  const collectionId = schemaToRepoMap[schemaName]
  if (['create', 'update'].includes(action)) {
    let dataOrig = get(
      req,
      `apiDoc.components.schemas.TeamSelfService.properties.${schemaName.toLowerCase()}.x-allow-values`,
      {},
    )

    try {
      const collection = repoService.getCollection(collectionId)
      dataOrig = find(collection, selector) || {}
    } catch (error) {
      debug('Error in authzMiddleware', error)
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
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return async function nextHandler(req: OpenApiRequestExt, res, next): Promise<any> {
    if (req.user) req.isSecurityHandler = true
    else return next()
    const otomi: OtomiStack = await getSessionStack(req.user.email)
    req.user.authz = getTeamSelfServiceAuthz(
      req.user.teams,
      req.apiDoc.components.schemas.TeamSelfService as TeamSelfService as PermissionSchema,
      otomi,
    )
    return authorize(req, res, next, authz, otomi.repoService)
  }
}
