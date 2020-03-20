module.exports = function(otomi) {
  var api = {
    post: [
      async function(req, res, next) {
        console.debug('Trigger deployments: ' + JSON.stringify(req.params))
        try {
          await otomi.triggerDeployment(req.headers['auth-group'])
          res.status(200).json({})
        } catch (err) {
          console.error(err)
          res.status(409).json({ error: err.message })
        }
      },
    ],
  }
  return api
}
