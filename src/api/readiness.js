module.exports = function (otomi) {
  const api = {
    get: [
      function (req, res, next) {
        res.status(200).json({})
      },
    ],
  }
  return api
}
