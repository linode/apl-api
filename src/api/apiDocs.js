module.exports = {
  get: function get(req, res, next) {
    return res.json(req.apiDoc)
  },
}
