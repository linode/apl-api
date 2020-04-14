module.exports = function (otomi) {
  const api = {
    get: [
      function (req, res, next) {
        const teamId = req.header('Auth-Group')
        const email = req.header('Auth-User')
        const data = {
          clusters: otomi.getClusters(),
          user: { email },
          teamId: teamId === 'admin' ? undefined : teamId,
          isAdmin: teamId === 'admin',
        }
        res.status(200).json(data)
      },
    ],
  }
  return api
}
