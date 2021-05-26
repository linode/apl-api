import get from 'lodash/get'
import { RequestHandler } from 'express'
import jwtDecode from 'jwt-decode'
import { HttpError, OtomiError } from './error'
import { OpenApiRequest, JWT, OpenApiRequestExt, User, PermissionSchema } from './otomi-models'
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
export function getCrudOperation(req: OpenApiRequest): string {
  return HttpMethodMapping[req.method]
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
    code = e.code ?? e.statusCode ?? e.status ?? 500
    msg = HttpError.fromCode(code).message
  }
  return res.status(code).json({ error: msg })
}

export function getUser(user: JWT): User {
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
      const team = group.substr(5)
      if (group.substr(0, 5) === 'team-' && group !== 'team-admin' && !sessionUser.teams.includes(team))
        sessionUser.teams.push(team)
    })
  }
  return sessionUser
}

export function jwtMiddleware(): RequestHandler {
  return function nextHandler(req: OpenApiRequestExt, res, next): any {
    const token = req.header('Authorization')
    if (!token) {
      console.log('anonymous request')
      return next()
    }
    const { name, email, roles, groups } = jwtDecode(token)
    req.user = getUser({ name, email, roles, groups })
    return next()
  }
}

export function authorize(req: OpenApiRequestExt, res, next, authz: Authz): any {
  let valid = false

  const {
    params: { teamId },
  } = req
  if (!req.user) return next()
  const { user } = req
  const action = getCrudOperation(req)
  const schema: string = get(req, 'operationDoc.x-aclSchema', '')
  const schemaName = schema.split('/').pop() || null

  // If there is no RBAC then we also skip ABAC
  if (!schemaName) return next()

  valid = authz.validateWithRbac(action, schemaName, user, teamId, req.body)
  if (!valid)
    return res
      .status(403)
      .send({ authz: false, message: `User not allowed to perform ${action} on ${schemaName} resource` })

  const violatedAttributes = validateWithAbac(action, schemaName, user, teamId, req.body)
  if (violatedAttributes.length > 0)
    return res.status(403).send({
      authz: false,
      message: 'User not allowed to modifiy attributes',
      attributes: `${JSON.stringify(violatedAttributes)}`,
    })

  return next()
}

export function authzMiddleware(authz: Authz, otomi: OtomiStack): RequestHandler {
  return function nextHandler(req: OpenApiRequestExt, res, next): any {
    if (!req.isSecurityHandler) return next()
    if (!req.user) return next()
    req.user.authz = getUserAuthz(
      req.user.teams,
      (req.apiDoc.components.schemas.TeamSelfService as unknown) as PermissionSchema,
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
