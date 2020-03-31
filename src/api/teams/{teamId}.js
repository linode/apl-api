module.exports = function (otomi) {
  var api = {
    get: [
      function (req, res, next) {
        console.debug('Get team: ' + JSON.stringify(req.params))
        const data = otomi.getTeam(req.params.teamId)
        res.status(200).json(data)
      },
    ],
    put: [
      function (req, res, next) {
        console.debug('Modify team: ' + JSON.stringify(req.params))
        const data = otomi.editTeam(req.params.teamId, req.body)
        res.status(200).json(data)
      },
    ],

    delete: [
      function (req, res, next) {
        console.debug('Delete team: ' + JSON.stringify(req.params))
        otomi.deleteTeam(req.params.teamId)
        res.status(200).json({})
      },
    ],
  }
  return api
}
