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
  const isAdmin = teamId === 'admin'
  const role = teamId === 'admin' ? 'admin' : 'team'

  return { user: { teamId, email, role, isAdmin } }
}

export function isAuthorizedFactory(authz: Authz) {
  const isAuthorized = (req: OpenApiRequest) => {
    const session = getSession(req)
    console.debug(`is user authorize teamId=${session.user.teamId}, role`)
    const schema: string = get(req, 'operationDoc.responses[200].content["application/json"].schema.$ref', '')
    const schemaName = schema.split('/').pop()
    return authz.isUserAuthorized('create', schemaName, session, req.params.teamId, req)
  }
  return isAuthorized
}
