module.exports = function (otomi) {

  var api = {
    post: [
      function(req, res, next) {
        console.debug("Trigger deployments: " + JSON.stringify(req.params))
        otomi.triggerDeployment(req.params)
        res.status(200).json({});
      },
    ],
  }
  return api;
};