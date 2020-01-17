const error = require('./error')

function errorMiddleware(err, req, res, next) {
  console.error(err)
  if (err instanceof error.AlreadyExists)
    return res.status(409).json({ error: err.message })
  if (err instanceof error.NotExistError)
    return res.status(404).json({ error: err.message })
  if (err instanceof error.GitError)
    return res.status(409).json({ error: err.message })

  if (typeof (err.status) !== undefined)
    return res.status(err.status).json(err)

  console.error(err)
  return res.status(500).json({ error: "Unexpected error" })

}

function isAuthorized(req, scopes, definition) {

  console.debug('isAuthorized')
  const group = req.header('Auth-Group')

  if (group === undefined)
    throw {
      status: 401,
      message: 'Not authenticated'
    };

  if (group === 'admin')
    return true

  // If not admin then we require that a team uses its id in request path
  if (group !== req.params.teamId)
    throw {
      status: 403,
      message: 'Not authorized' 
    };

  return true
}


module.exports = {
  errorMiddleware: errorMiddleware,
  isAuthorized: isAuthorized,
};