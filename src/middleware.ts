import get from 'lodash/get'
import { RequestHandler } from 'express'
import jwtDecode from 'jwt-decode'
import { HttpError, OtomiError } from './error'
import { OpenApiRequest, JWT, OpenApiRequestExt, User } from './otomi-models'
import Authz from './authz'
import { cleanEnv, NO_AUTHZ } from './validators'

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
    code = e.code ?? e.statusCode ?? e.status ?? 500
    msg = HttpError.fromCode(code).message
  }
  return res.status(code).json({ error: msg })
}

export function getUser(user: JWT): User {
  const sessionUser: User = { ...user, teams: [], roles: [], isAdmin: false }
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

export function getCrudOperation(req: OpenApiRequest): string {
  return HttpMethodMapping[req.method]
}

export function isUserAuthorized(req: OpenApiRequestExt, authz: Authz): boolean {
  if (env.NO_AUTHZ) return true
  const {
    params: { teamId },
  } = req
  const { user } = req
  const action = getCrudOperation(req)
  console.debug(
    `Authz: ${action} ${req.path}, session(roles: ${user && JSON.stringify(user.roles)} teams=${
      user && JSON.stringify(user.teams)
    })`,
  )
  if (!user) return false
  const schema: string = get(req, 'operationDoc.x-aclSchema', '')
  const schemaName = schema.split('/').pop()
  const result = authz.isUserAuthorized(action, schemaName!, user, teamId, req.body)
  return result
}
