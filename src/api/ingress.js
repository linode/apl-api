module.exports = function (otomi) {

  var api = {
    get: [
      function (req, res, next) {
        console.info("Get ingress: " + JSON.stringify(req.params))
        const data = otomi.getIngressCollection(req.params)

        res.status(200).json(data);
      }
    ],

    post: function (req, res, next) {
      console.debug("Create ingress" + JSON.stringify(req.params))
      const data = otomi.createIngress(req.params, req.body)
      res.status(200).json(data)
    }
  }
  return api;
};