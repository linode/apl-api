import get from 'lodash/get'
import { AlreadyExists, GitError, NotAuthorized, NotExistError, PublicUrlExists } from './error'
import { OpenApiRequest, JWT, OpenApiRequestExt, SessionUser } from './otomi-models'
import Authz from './authz'
import { RequestHandler } from 'express'
import jwtDecode from 'jwt-decode'
import { cleanEnv, CLUSTER_ID } from './validators'

export const env = cleanEnv(process.env, { CLUSTER_ID }, { strict: process.env.NODE_ENV !== 'test' })

const HttpMethodMapping = {
  DELETE: 'delete',
  GET: 'read',
  PATCH: 'update',
  POST: 'create',
  PUT: 'update',
}

export function errorMiddleware(err, req: OpenApiRequest, res) {
  console.error('errorMiddleware handler')

  if (err instanceof AlreadyExists) return res.status(409).json({ error: err.message })
  if (err instanceof NotExistError) return res.status(404).json({ error: err.message })
  if (err instanceof PublicUrlExists) return res.status(400).json({ error: err.message })
  if (err instanceof GitError) return res.status(409).json({ error: err.message })
  if (err instanceof NotAuthorized || err.name === 'UnauthorizedError')
    return res.status(401).json({ error: err.message })

  if (typeof err.status !== 'undefined') return res.status(err.status).json(err)

  console.error(err)
  return res.status(500).json({ error: 'Unexpected error' })
}

export function getSessionUser(user: JWT): SessionUser {
  const sessionUser = { ...user, teams: [], groups: user.groups || [], roles: [], isAdmin: false }
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
    if (group.substr(0, 5) === 'team-' && group !== 'team-admin') sessionUser.teams.push(group.substr(5))
  })
  return sessionUser
}

export function jwtMiddleware(): RequestHandler {
  return function (req: OpenApiRequestExt, res, next) {
    if (env.isDev) {
      // allow the client to specify a group to be in
      const group = req.header('Auth-Group') ? `team-${req.header('Auth-Group')}` : undefined
      // default to admin unless team is given
      const isAdmin = !group || group === 'team-admin'
      const groups = [`team-${env.CLUSTER_ID.split('/')[1]}`, 'team-otomi']
      if (group && !groups.includes(group)) groups.push(group)
      req.user = getSessionUser({
        name: isAdmin ? 'Bob Admin' : 'Joe Team',
        email: isAdmin ? 'bob.admin@otomi.cloud' : `joe.team@otomi.cloud`,
        groups,
        roles: [],
      })
    } else {
      const token = req.header('Authorization')
      if (!token) {
        console.log('anonymous request')
        return next()
      }
      const { name, email, roles, groups } = jwtDecode(token)
      req.user = getSessionUser({ name, email, roles, groups })
    }
    next()
  }
}

export function getCrudOperation(req: OpenApiRequest) {
  return HttpMethodMapping[req.method]
}

export function isUserAuthorized(req: OpenApiRequestExt, authz: Authz) {
  const {
    params: { teamId },
  } = req
  const user = req.user
  const action = getCrudOperation(req)
  console.debug(
    `Authz: ${action} ${req.path}, session(roles: ${user && JSON.stringify(user.roles)} teams=${
      user && JSON.stringify(user.teams)
    })`,
  )
  if (!user) return false
  const schema: string = get(req, 'operationDoc.x-aclSchema', '')
  const schemaName = schema.split('/').pop()
  const result = authz.isUserAuthorized(action, schemaName, user, teamId, req.body)
  return result
}
