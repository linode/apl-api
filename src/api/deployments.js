module.exports = function (otomi) {

  var api = {
    post: [
      async function (req, res, next) {
        console.debug("Trigger deployments: " + JSON.stringify(req.params))
        try {
          await otomi.triggerDeployment(req.params, req.headers['auth-group'])
        } catch (err) {
          console.error(err.message)
          res.status(409).json({ error: err.message })
        }

        res.status(200).json({});
      },
    ],
  }
  return api;
};