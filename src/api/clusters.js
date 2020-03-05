module.exports = function (otomi) {

  var api = {
    get: [
      function (req, res, next) {
        console.info("Get clusters: " + JSON.stringify(req.params))
        const data = otomi.getClusters(req.params)

        res.status(200).json(data);
      }
    ],
  }
  return api;
};