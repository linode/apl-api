import { AlreadyExists, GitError, NotAuthorized, NotExistError, PublicUrlExists } from './error'

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

export function isAuthorized(req) {
  console.debug('isAuthorized')
  const group = req.header('Auth-Group')

  if (group === undefined) {
    return false
    // throw new NotAuthorized('Missing Auth-Group header')
  }

  return true
}
