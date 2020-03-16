module.exports = function (otomi) {

  var api = {
    get: [
      function (req, res, next) {
        console.debug("Get service: " + JSON.stringify(req.params))
        const data = otomi.getService(req.params.teamId)
        res.status(200).json(data);
      }
    ],
    put: [
      function (req, res, next) {
        console.debug("Modify service: " + JSON.stringify(req.params))
        const data = otomi.editService(req.params.teamId, req.body)
        res.status(200).json(data);
      }
    ],

    delete: [
      function (req, res, next) {
        console.debug("Delete service: " + JSON.stringify(req.params))
        otomi.deleteService(req.params.teamId)
        res.status(200).json({});
      }
    ]
  }
  return api;
};


