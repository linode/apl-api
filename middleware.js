const otomi = require('./otomi-stack')

function errorMiddleware(err, req, res, next) {

  if (err instanceof otomi.AlreadyExists)
    return res.status(409).json({ error: err.message })
  if (err instanceof otomi.NotExistError)
    return res.status(404).json({ error: err.message })
  
  if (typeof(err.status) === undefined)
    return res.status(err.status).json(err)

  console.error(err)
  return res.status(500).json({ error: "Unexpected error" })

}

module.exports = {
  errorMiddleware: errorMiddleware,
};