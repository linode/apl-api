module.exports = function (otomi) {
  var api = {
    get: [
      function (req, res, next) {
        res.status(200).json({})
      },
    ],
  }
  return api
}
