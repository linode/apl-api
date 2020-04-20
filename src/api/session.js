const env = process.env
module.exports = function (otomi) {
  const api = {
    get: [
      function (req, res, next) {
        const teamId = req.header('Auth-Group')
        const email = req.header('Auth-User')
        const isAdmin = teamId === 'admin'
        const role = teamId === 'admin' ? 'admin' : 'team'
        const data = {
          currentClusterId: env.CLUSTER ? env.CLUSTER : env.NODE_ENV !== 'production' ? 'azure/dev' : '',
          clusters: otomi.getClusters(),
          core: otomi.getCore(),
          user: { email, teamId, isAdmin, role },
          isDirty: otomi.db.isDirty(),
        }
        res.status(200).json(data)
      },
    ],
  }
  return api
}
