/* eslint-disable no-param-reassign */
import get from 'lodash/get'
import { RequestHandler } from 'express'
import jwtDecode from 'jwt-decode'
import { omit } from 'lodash'
import { HttpError, OtomiError } from './error'
import { OpenApiRequest, JWT, OpenApiRequestExt, User, PermissionSchema, TeamSelfService } from './otomi-models'
import Authz, { getUserAuthz, validateWithAbac } from './authz'
import { cleanEnv, NO_AUTHZ } from './validators'
import OtomiStack from './otomi-stack'

const env = cleanEnv({
  NO_AUTHZ,
})

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
  console.error('errorMiddleware error', e)
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
  if (env.NO_AUTHZ) {
    sessionUser.isAdmin = true
  } else {
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
        const coll = otomi.db.db.get('team')
        // @ts-ignore
        if (coll.find({ id: teamId }).value()) sessionUser.teams.push(teamId)
      }
    })
  }
  return sessionUser
}

export function jwtMiddleware(otomi: OtomiStack): RequestHandler {
  return function nextHandler(req: OpenApiRequestExt, res, next): any {
    const token = req.header('Authorization')
    if (!token && env.isDev) {
      // allow the client to specify a group to be in
      const { team = 'otomi' } = req.query
      // default to admin unless team is given
      const isAdmin = !team || team === 'admin'
      const groups = ['team-demo', 'team-otomi']
      if (team && !groups.includes(`team-${team}`)) groups.push(`team-${team}`)
      req.user = getUser(
        {
          name: isAdmin ? 'Bob Admin' : 'Joe Team',
          email: isAdmin ? 'bob.admin@otomi.cloud' : `joe.team@otomi.cloud`,
          groups,
          roles: [],
        },
        otomi,
      )
      return next()
    }
    if (!token) {
      console.log('anonymous request')
      return next()
    }
    const { name, email, roles, groups } = jwtDecode(token)
    req.user = getUser({ name, email, roles, groups }, otomi)
    return next()
  }
}

export function authorize(req: OpenApiRequestExt, res, next, authz: Authz): RequestHandler {
  let valid = false

  const {
    params: { teamId },
  } = req
  if (!req.user) return next()
  const { user } = req
  const action = HttpMethodMapping[req.method]
  const schema: string = get(req, 'operationDoc.x-aclSchema', '')
  const schemaName = schema.split('/').pop() || null

  // If there is no RBAC then we also skip ABAC
  if (!schemaName) return next()

  valid = authz.validateWithRbac(action, schemaName, user, teamId, req.body)
  if (action === 'read' && schemaName === 'Kubecfg')
    valid = valid && authz.hasSelfService(user, teamId, 'Team', 'downloadKubeConfig')
  if (!valid)
    return res
      .status(403)
      .send({ authz: false, message: `User not allowed to perform ${action} on ${schemaName} resource` })

  const violatedAttributes = validateWithAbac(action, schemaName, user, teamId, req.body)

  // A users sends valid form abac is used to remove these fields that are not allowed to be set
  req.body = omit(req.body, violatedAttributes)

  return next()
}

export function authzMiddleware(authz: Authz, otomi: OtomiStack): RequestHandler {
  return function nextHandler(req: OpenApiRequestExt, res, next): any {
    if (!req.isSecurityHandler) return next()
    if (!req.user) return next()
    req.user.authz = getUserAuthz(
      req.user.teams,
      (req.apiDoc.components.schemas.TeamSelfService as TeamSelfService) as PermissionSchema,
      otomi,
    )
    return authorize(req, res, next, authz)
  }
}

// eslint-disable-next-line no-unused-vars
export function isUserAuthenticated(req: OpenApiRequestExt): boolean {
  if (env.NO_AUTHZ) return true
  if (req.user) {
    req.isSecurityHandler = true
    return true
  }
  return false
}
