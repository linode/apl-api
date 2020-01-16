module.exports = function (otomi) {

  var api = {
    get: [
      function (req, res, next) {
        console.debug("Get service: " + req.params.serviceId + " from team: " + req.params.teamId)
        const data = otomi.getService(req.params.teamId, req.params.serviceId)
        res.status(200).json(data);
      }
    ],
    put: [
      function (req, res, next) {
        console.debug("Modify service: " + req.params.serviceId + " from team: " + req.params.teamId)
        const data = otomi.editService(req.params.teamId, req.params.serviceId, res.body)
        res.status(200).json(data);
      }
    ],

    delete: [
      function (req, res, next) {
        console.debug("Delete service: " + req.params.serviceId + " from team: " + req.params.teamId)
        otomi.editService(req.params.teamId, req.params.serviceId)
        res.status(200).json({});
      }
    ]
  }
  return api;
};


