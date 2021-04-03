import get from 'lodash/get'
import { RequestHandler } from 'express'
import jwtDecode from 'jwt-decode'
import { AlreadyExists, GitError, NotAuthorized, NotExistError, PublicUrlExists } from './error'
import { OpenApiRequest, JWT, OpenApiRequestExt, User } from './otomi-models'
import Authz from './authz'

const HttpMethodMapping = {
  DELETE: 'delete',
  GET: 'read',
  PATCH: 'update',
  POST: 'create',
  PUT: 'update',
}

const noAuthz = !!process.env.NO_AUTHZ

export function errorMiddleware(err, req: OpenApiRequest, res): void {
  console.error('errorMiddleware handler')

  if (err instanceof AlreadyExists) return res.status(409).json({ error: err.message })
  if (err instanceof NotExistError) return res.status(404).json({ error: err.message })
  if (err instanceof PublicUrlExists) return res.status(400).json({ error: err.message })
  if (err instanceof GitError) return res.status(409).json({ error: err.message })
  if (err instanceof NotAuthorized || err.name === 'UnauthorizedError')
    return res.status(401).json({ error: err.message })

  if (typeof err.status !== 'undefined') {
    return res.status(err.status).json(err)
  }

  console.error(err)
  return res.status(500).json({ error: 'Unexpected error' })
}

export function getUser(user: JWT): User {
  const sessionUser: User = { ...user, teams: [], roles: [], isAdmin: false }
  // keycloak does not (yet) give roles, so
  // for now we map correct group names to roles
  if (noAuthz) {
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
  if (noAuthz) return true
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
