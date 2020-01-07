module.exports = {

  get: [
    function(req, res, next) {
      console.debug("Get teams")
      res.status(200).json([{}]);
    }
  ],

  post: function(req, res, next) {
    console.debug("Create team")
    res.status(200).json({});
  }
};