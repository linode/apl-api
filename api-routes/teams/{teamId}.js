module.exports = {
  // or they may also be an array of middleware + the method handler.  This allows
  // for flexible middleware management.  express-openapi middleware generated from
  // the <path>.parameters + <methodHandler>.apiDoc.parameters is prepended to this
  // array.
  post: [
    function(req, res, next) {
      console.debug("Create a team")
      res.status(200).json({});
    }
  ],
  get: [
    function(req, res, next) {
      console.debug("Get a team")
      res.status(200).json({ id: req.params.teamId });
    }
  ],
  put: [
    function(req, res, next) {
      console.debug("Modify team")
      res.status(200).json({ id: req.params.name });
    }
  ],

  delete: [
    function(req, res, next) {
      console.debug("Delete team")
      res.status(200).json({ id: req.params.name });
    }
  ]
};
