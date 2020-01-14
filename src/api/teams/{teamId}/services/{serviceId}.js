module.exports = function (otomi) {

  var api = {
    get: [
      function (req, res, next) {
        console.debug("Get service: " + req.params.serviceId)
        // const data = otomi.getTeam(req.params.teamId)
        const data = {}
        res.status(200).json(data);
      }
    ],
    put: [
      function (req, res, next) {
        console.debug("Modify service: " + req.params.serviceId)
        // const data = otomi.editTeam(req.params.teamId, req.body)
        const data = {}
        res.status(200).json(data);
      }
    ],

    delete: [
      function (req, res, next) {
        console.debug("Delete service: " + req.params.serviceId)
        // otomi.deleteTeam(req.params.teamId)
        res.status(200).json({});
      }
    ]
  }
  return api;
};