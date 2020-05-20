import get from 'lodash/get'
import { AlreadyExists, GitError, NotAuthorized, NotExistError, PublicUrlExists } from './error'
import { OpenApiRequest, Session } from './api.d'
import Authz from './authz'

export function errorMiddleware(err, req, res, next) {
  console.error('errorMiddleware handler')

  if (err instanceof AlreadyExists) return res.status(409).json({ error: err.message })
  if (err instanceof NotExistError) return res.status(404).json({ error: err.message })
  if (err instanceof PublicUrlExists) return res.status(400).json({ error: err.message })
  if (err instanceof GitError) return res.status(409).json({ error: err.message })
  if (err instanceof NotAuthorized) return res.status(401).json({ error: err.message })

  if (typeof err.status !== 'undefined') return res.status(err.status).json(err)

  console.error(err)
  return res.status(500).json({ error: 'Unexpected error' })
}

export function getSession(req: OpenApiRequest): Session {
  const teamId = req.header('Auth-Group')
  const email = req.header('Auth-User')
  if (!teamId) return null
  const isAdmin = teamId === 'admin'
  const role = teamId === 'admin' ? 'admin' : 'team'

  return { user: { teamId, email, role, isAdmin } }
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

function isUserAuthorized(req: OpenApiRequest, authz: Authz) {
  const session = req.session
  const action = getCrudOperation(req)
  console.debug(`Authz: ${action} ${req.path}, session(role: ${session.user.role} team=${session.user.teamId})`)
  const schema: string = get(req, 'operationDoc.x-aclSchema', '')
  const schemaName = schema.split('/').pop()
  const result = authz.isUserAuthorized(action, schemaName, session, req.params.teamId, req.body)
  return result
}

export function isAuthorizedFactory(authz: Authz) {
  const isAuthorized = (req: OpenApiRequest, scopes: [], definitions: any) => {
    const session = getSession(req)
    if (!session) return false
    req.session = session

    const authorized = isUserAuthorized(req, authz)
    return authorized
  }
  return isAuthorized
}
