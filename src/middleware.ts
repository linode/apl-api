/* eslint-disable no-param-reassign */
import { debug, error } from 'console'
import { RequestHandler } from 'express'
import jwtDecode from 'jwt-decode'
import get from 'lodash/get'
import Authz, { getTeamSelfServiceAuthz } from './authz'
import { HttpError, OtomiError } from './error'
import { JWT, OpenApiRequest, OpenApiRequestExt, PermissionSchema, TeamSelfService, User } from './otomi-models'
import OtomiStack from './otomi-stack'
import { cleanEnv, NO_AUTHZ, NO_AUTHZ_MOCK_IS_ADMIN, NO_AUTHZ_MOCK_TEAM } from './validators'

const env = cleanEnv({
  NO_AUTHZ,
  NO_AUTHZ_MOCK_IS_ADMIN,
  NO_AUTHZ_MOCK_TEAM,
})

const badCode = (code) => code >= 300 || code < 200

const HttpMethodMapping = {
  DELETE: 'delete',
  GET: 'read',
  PATCH: 'update',
  POST: 'create',
  PUT: 'update',
}

// Note: 4 arguments (no more, no less) must be defined in your errorMiddleware function. Otherwise the function will be silently ignored.
// eslint-disable-next-line no-unused-vars
export function errorMiddleware(e, req: OpenApiRequest, res, next): void {
  if (env.isDev) error('errorMiddleware error', e)
  else debug('errorMiddleware error', e)
  let code
  let msg
  if (e instanceof OtomiError) {
    code = e.code
    msg = e.publicMessage
  } else {
    code = e.code ?? e.statusCode ?? e.status ?? e.response?.status ?? 500
    const errMsg = e.message ?? e.response?.data
    msg = `${HttpError.fromCode(code).message}`
    if (errMsg) msg += `: ${errMsg}`
  }
  return res.status(code).json({ error: msg })
}

export function getUser(user: JWT, otomi: OtomiStack): User {
  const sessionUser: User = { ...user, teams: [], roles: [], isAdmin: false, authz: {} }
  // keycloak does not (yet) give roles, so
  // for now we map correct group names to roles
  user.groups.forEach((group) => {
    if (['admin', 'team-admin'].includes(group)) {
      if (!sessionUser.roles.includes('admin')) {
        sessionUser.isAdmin = true
        sessionUser.roles.push('admin')
      }
    } else if (!sessionUser.roles.includes('team')) sessionUser.roles.push('team')
    // if in team-(not admin), remove 'team-' prefix
    const teamId = group.substr(5)
    if (group.substr(0, 5) === 'team-' && group !== 'team-admin' && !sessionUser.teams.includes(teamId)) {
      // we might be assigned team-* without that team yet existing in the values, so ignore those
      const existing = otomi.db.getItemReference('teams', { id: teamId }, false)
      if (existing) sessionUser.teams.push(teamId)
    }
  })

  return sessionUser
}

export function jwtMiddleware(otomi: OtomiStack): RequestHandler {
  return function nextHandler(req: OpenApiRequestExt, res, next): any {
    const token = req.header('Authorization')
    if (env.isDev && env.NO_AUTHZ) {
      req.user = getUser(
        {
          name: env.NO_AUTHZ_MOCK_IS_ADMIN ? 'Bob Admin' : 'Joe Team',
          email: env.NO_AUTHZ_MOCK_IS_ADMIN ? 'bob.admin@otomi.cloud' : `joe.team@otomi.cloud`,
          groups: env.NO_AUTHZ_MOCK_IS_ADMIN ? ['team-admin'] : [`team-${env.NO_AUTHZ_MOCK_TEAM}`],
          roles: [],
        },
        otomi,
      )
      return next()
    }
    if (!token) {
      debug('anonymous request')
      return next()
    }
    const { name, email, roles, groups } = jwtDecode(token)
    req.user = getUser({ name, email, roles, groups }, otomi)
    return next()
  }
}

const wrapResponse = (filter, orig) => {
  return function (obj, ...rest) {
    if (arguments.length === 1) {
      if (badCode(this.statusCode)) return orig(this.statusCode, obj)

      const ret = filter(obj)
      return orig(ret)
    }

    if (typeof rest[0] === 'number' && !badCode(rest[0])) {
      // res.json(body, status) backwards compat
      const ret = filter(obj)
      return orig(ret, rest[0])
    }

    if (typeof obj === 'number' && !badCode(obj)) {
      // res.json(status, body) backwards compat
      const ret = filter(obj)
      return orig(obj, ret)
    }

    // The original actually returns this.send(body)
    return orig(obj, rest[0])
  }
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

export function authorize(req: OpenApiRequestExt, res, next, authz: Authz, otomi: OtomiStack): RequestHandler {
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

    if (action === 'update') dataOrig = otomi.db.getItemReference(tableName, selector, false) as any
    const violatedAttributes = authz.validateWithAbac(action, schemaName, teamId, req.body, dataOrig)
    if (violatedAttributes.length > 0) {
      return res.status(403).send({
        authz: false,
        message: `User not allowed to modify the following attributes ${violatedAttributes}" of ${schemaName}" resource`,
      })
    }
  }
  // filter response based on abac
  // res.json = wrapResponse((obj) => authz.filterWithAbac(schemaName, teamId, obj), res.json.bind(res))
  // res.json = wrapResponse((obj) => authz.filterWithAbac(schemaName, teamId, obj), res.json.bind(res))

  return next()
}

export function authzMiddleware(authz: Authz, otomi: OtomiStack): RequestHandler {
  return function nextHandler(req: OpenApiRequestExt, res, next): any {
    if (!req.isSecurityHandler) return next()
    if (!req.user) return next()
    req.user.authz = getTeamSelfServiceAuthz(
      req.user.teams,
      req.apiDoc.components.schemas.TeamSelfService as TeamSelfService as PermissionSchema,
      otomi,
    )
    return authorize(req, res, next, authz, otomi)
  }
}

// eslint-disable-next-line no-unused-vars
export function isUserAuthenticated(req: OpenApiRequestExt): boolean {
  // if (env.NO_AUTHZ) return true
  if (req.user) {
    req.isSecurityHandler = true
    return true
  }
  return false
}
