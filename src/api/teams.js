module.exports = function (otomi) {
  const api = {
    get: [
      function (req, res, next) {
        const data = otomi.getTeams()

        res.status(200).json(data)
      },
    ],

    post: function (req, res, next) {
      const data = otomi.createTeam(req.body)
      res.status(200).json(data)
    },
  }
  return api
}
