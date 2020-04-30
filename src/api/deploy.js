module.exports = function (otomi) {
  const api = {
    get: [
      async function (req, res, next) {
        console.debug(`Trigger deployment: ${JSON.stringify(req.params)}`)
        const teamId = req.header('Auth-Group')
        const email = req.header('Auth-User')
        try {
          await otomi.triggerDeployment(teamId, email)
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
