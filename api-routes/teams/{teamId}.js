module.exports = function (otomi) {

  var api = {
    get: [
      function (req, res, next) {
        console.debug("Get team: " + req.params.teamId)
        const data = otomi.getTeam(req.params.teamId)
        if (data === undefined)
          res.status(404).json({})
        res.status(200).json(data);
      }
    ],
    put: [
      function (req, res, next) {
        console.debug("Modify team")
        res.status(200).json({ id: req.params.name });
      }
    ],

    delete: [
      function (req, res, next) {
        console.debug("Delete team")
        res.status(200).json({ id: req.params.name });
      }
    ]
  }
  return api;
};