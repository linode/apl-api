import get from 'lodash/get'
import { AlreadyExists, GitError, NotAuthorized, NotExistError, PublicUrlExists } from './error'
import { OpenApiRequest, JWT, OpenApiRequestExt, SessionUser, SessionRole } from './otomi-models'
import Authz from './authz'

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
  const sessionUser = { ...user, teams: [], groups: user.groups || [], isAdmin: false }
  // for now we map correct group names to roles
  user.groups.forEach((group) => {
    if (['admin', 'team-admin'].includes(group) && !sessionUser.roles.includes('admin')) {
      sessionUser.isAdmin = true
      sessionUser.roles.push('admin')
    } else if (!sessionUser.roles.includes('team')) sessionUser.roles.push('team')
    // if in team-(not admin), remove 'team-' prefix
    if (group.substr(0, 5) === 'team-' && group !== 'team-admin') sessionUser.teams.push(group.substr(5))
  })
  return sessionUser
}

const HttpMethodMapping = {
  DELETE: 'delete',
  GET: 'read',
  PATCH: 'update',
  POST: 'create',
  PUT: 'update',
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
