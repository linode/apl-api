module.exports = function (otomi) {

  var api = {
    get: [
      function (req, res, next) {
        console.info("Get teams: " + JSON.stringify(req.params))
        const data = otomi.getTeams(req.params)

        res.status(200).json(data);
      }
    ],

    post: function (req, res, next) {
      console.debug("Create team" + JSON.stringify(req.params))
      const data = otomi.createTeam(req.params, req.body)
      res.status(200).json(data)
    }
  }
  return api;
};