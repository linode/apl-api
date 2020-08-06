import get from 'lodash/get'
import { AlreadyExists, GitError, NotAuthorized, NotExistError, PublicUrlExists } from './error'
import { OpenApiRequest, JWT, OpenApiRequestExt, SessionUser } from './otomi-models'
import Authz from './authz'
import jwt from 'express-jwt'
import jwksRsa from 'jwks-rsa'

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

const env = process.env
export function jwtMiddleware() {
  if (env.NODE_ENV === 'development')
    return function (err, req: OpenApiRequestExt, res, next) {
      // allow the client to specify a group to be in
      const group = req.header('Auth-Group') ? `team-${req.header('Auth-Group')}` : undefined
      // default to admin unless team is given
      const isAdmin = !group || group === 'team-admin'
      const groups = [`team-${env.CLUSTER_ID.split('/')[1]}`, 'team-otomi']
      if (group && !groups.includes(group)) groups.push(group)
      req.user = getSessionUser({
        email: isAdmin ? 'bob.admin@otomi.cloud' : `joe.team@otomi.cloud`,
        groups,
        roles: [],
      })
      next()
    }
  else
    return jwt({
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${env.OIDC_ENDPOINT}/.well-known/jwks.json`,
      }),
      issuer: env.OIDC_ENDPOINT,
      audience: env.OIDC_NAME,
      algorithms: ['RS256'],
    }).unless({
      path: ['/v1/readiness', '/v1/apiDocs'],
    })
}

export function mapGroupsToRoles() {
  return (req: any, res, next) => {
    if (req.user) req.user = getSessionUser(req.user)
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
    `Authz: ${action} ${req.path}, session(roles: ${JSON.stringify(user.roles)} teams=${JSON.stringify(user.teams)})`,
  )
  const schema: string = get(req, 'operationDoc.x-aclSchema', '')
  const schemaName = schema.split('/').pop()
  const result = authz.isUserAuthorized(action, schemaName, user, teamId, req.body)
  return result
}
