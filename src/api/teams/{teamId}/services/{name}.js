module.exports = function (otomi) {
  const api = {
    get: [
      function (req, res, next) {
        console.debug('Get service: ' + JSON.stringify(req.params))
        const { teamId, name } = req.params
        const { clusterId } = req.query
        const data = otomi.getService(teamId, name, clusterId)
        res.status(200).json(data)
      },
    ],
    put: [
      function (req, res, next) {
        console.debug('Modify service: ' + JSON.stringify(req.params))
        const { teamId, name } = req.params
        const { clusterId } = req.body
        const data = otomi.editService(teamId, name, clusterId, req.body)
        res.status(200).json(data)
      },
    ],

    delete: [
      function (req, res, next) {
        console.debug('Delete service: ' + JSON.stringify(req.params))
        const { teamId, name } = req.params
        const { clusterId } = req.query
        otomi.deleteService(teamId, name, clusterId)
        res.status(200).json({})
      },
    ],
  }
  return api
}
