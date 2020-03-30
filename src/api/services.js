module.exports = function (otomi) {
  var api = {
    get: [
      function (req, res, next) {
        console.debug('Get all services')
        const v = otomi.getAllServices()
        res.status(200).json(v)
      },
    ],
  }
  return api
}
