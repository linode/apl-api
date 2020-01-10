module.exports = function (otomi) {

  var api = {
    post: [
      function(req, res, next) {
        console.debug("Trigger deployment")
        otomi.deploy()
        res.status(200).json({});
      }
    ],
  }
  return api;
};