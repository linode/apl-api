module.exports = function (otomi) {

  var api = {
    get: [
      function (req, res, next) {
        console.debug("Get all service: " + JSON.stringify(req.params))
        const data = otomi.getAllServices()
        res.status(200).json(data);
      }
    ],
  }
  return api;
};
