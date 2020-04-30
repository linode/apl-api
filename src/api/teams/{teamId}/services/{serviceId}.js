module.exports = function (otomi) {
  const api = {
    get: [
      function (req, res, next) {
        console.debug(`Get service: ${JSON.stringify(req.params)}`)
        const { serviceId } = req.params
        const data = otomi.getService(decodeURIComponent(serviceId))
        res.status(200).json(data)
      },
    ],
    put: [
      function (req, res, next) {
        console.debug(`Modify service: ${JSON.stringify(req.params)}`)
        const { serviceId } = req.params
        const data = otomi.editService(decodeURIComponent(serviceId), req.body)
        res.status(200).json(data)
      },
    ],

    delete: [
      function (req, res, next) {
        console.debug(`Delete service: ${JSON.stringify(req.params)}`)
        const { serviceId } = req.params
        otomi.deleteService(decodeURIComponent(serviceId))
        res.status(200).json({})
      },
    ],
  }
  return api
}
