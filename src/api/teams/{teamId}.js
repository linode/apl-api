module.exports = function (otomi) {

  var api = {
    get: [
      function (req, res, next) {
        console.debug("Get team: " + req.params.teamId)
        const data = otomi.getTeam(req.params.teamId)
        res.status(200).json(data);
      }
    ],
    put: [
      function (req, res, next) {
        console.debug("Modify team")
        const data = otomi.editTeam(req.params.teamId, req.body)
        res.status(200).json(data);
      }
    ],

    delete: [
      function (req, res, next) {
        console.debug("Delete team: " + req.params.teamId)
        otomi.deleteTeam(req.params.teamId)
        res.status(200).json({});
      }
    ]
  }
  return api;
};