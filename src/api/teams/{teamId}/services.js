module.exports = function (otomi) {
  const api = {
    get: [
      function (req, res, next) {
        console.debug(`Get services: ${JSON.stringify(req.params)}`)
        const v = otomi.getTeamServices(req.params.teamId)
        res.status(200).json(v)
      },
    ],
    post: [
      function (req, res, next) {
        console.debug(`Create a new service: ${JSON.stringify(req.params)}`)
        const v = otomi.createService({ teamId: req.params.teamId, ...req.body })
        res.status(200).json(v)
      },
    ],
  }
  return api
}
