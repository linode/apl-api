module.exports = function (otomi) {

  var api = {
    get: [
      function(req, res, next) {
        console.debug("Get services")
        res.status(200).json({});
      },
    ],
    post: [
      function(req, res, next) {
        console.debug("Create a new service")
        res.status(200).json({});
      },
    ],
  }
  return api;
};