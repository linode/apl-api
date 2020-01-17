module.exports = function (otomi) {

  var api = {
    get: [
      function(req, res, next) {
        console.debug("Get deployments: " + JSON.stringify(req.params))
        // const v = otomi.getDeployments(req.params)
        res.status(501).json({});
      },
    ],
    post: [
      function(req, res, next) {
        console.debug("Trigger deployments: " + JSON.stringify(req.params))
        const v = otomi.triggerDeployment(req.params)
        res.status(501).json(v);
      },
    ],
  }
  return api;
};