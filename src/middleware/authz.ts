/* eslint-disable no-param-reassign */
import { RequestHandler } from 'express'
import get from 'lodash/get'
import Authz, { getTeamSelfServiceAuthz } from 'src/authz'
import Db from 'src/db'
import { OpenApiRequestExt, PermissionSchema, TeamSelfService } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { getSessionStack } from './session'

const HttpMethodMapping = {
  DELETE: 'delete',
  GET: 'read',
  PATCH: 'update',
  POST: 'create',
  PUT: 'update',
}

function renameKeys(obj) {
  const newKeys = {
    serviceId: 'id',
    secretId: 'id',
    jobId: 'id',
  }
  if (Object.keys(obj).length === 1 && 'teamId' in obj) return { id: obj.teamId }
  const keyValues = Object.keys(obj).map((key) => {
    const newKey = newKeys[key] || key
    return { [newKey]: obj[key] }
  })
  return Object.assign({}, ...keyValues)
}

const badCode = (code) => code >= 300 || code < 200
const wrapResponse = (filter, orig) => {
  return function (obj, ...rest) {
    if (badCode(this.statusCode)) return orig(obj)
    const ret = filter(obj)
    return orig(ret)
  }
}

export function authorize(req: OpenApiRequestExt, res, next, authz: Authz, db: Db): RequestHandler {
  const {
    params: { teamId },
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
  if (action === 'read' && schemaName === 'Kubecfg') valid = authz.hasSelfService(teamId, 'team', 'downloadKubeConfig')
  else valid = authz.validateWithRbac(action, schemaName, teamId, req.body)
  if (!valid) {
    return res
      .status(403)
      .send({ authz: false, message: `User not allowed to perform "${action}" on "${schemaName}" resource` })
  }

  const schemaToDbMap = {
    Job: 'jobs',
    Secret: 'secrets',
    Service: 'services',
    Team: 'teams',
  }

  const selector = renameKeys(req.params)

  const tableName = schemaToDbMap?.[schemaName]
  if (tableName && ['create', 'update'].includes(action)) {
    let dataOrig = get(
      req,
      `apiDoc.components.schemas.TeamSelfService.properties.${schemaName.toLowerCase()}.x-allow-values`,
      {},
    )

    if (action === 'update') dataOrig = db.getItemReference(tableName, selector, false) as any
    const violatedAttributes = authz.validateWithAbac(action, schemaName, teamId, req.body, dataOrig)
    if (violatedAttributes.length > 0) {
      return res.status(403).send({
        authz: false,
        message: `User not allowed to modify the following attributes ${violatedAttributes}" of ${schemaName}" resource`,
      })
    }
  }
  // filter response based on abac
  res.json = wrapResponse((obj) => authz.filterWithAbac(schemaName, teamId, obj), res.json.bind(res))

  return next()
}

export function authzMiddleware(authz: Authz): RequestHandler {
  return async function nextHandler(req: OpenApiRequestExt, res, next): Promise<any> {
    if (req.user) req.isSecurityHandler = true
    else return next()
    const otomi: OtomiStack = await getSessionStack(req.user.email)
    req.user.authz = getTeamSelfServiceAuthz(
      req.user.teams,
      req.apiDoc.components.schemas.TeamSelfService as TeamSelfService as PermissionSchema,
      otomi,
    )
    return authorize(req, res, next, authz, otomi.db)
  }
}
