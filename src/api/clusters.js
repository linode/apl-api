module.exports = function (otomi) {
  const api = {
    get: [
      function (req, res, next) {
        console.info('Get clusters: ' + JSON.stringify(req.params))
        const data = otomi.getClusters(req.params)

        res.status(200).json(data)
      },
    ],
  }
  return api
}
