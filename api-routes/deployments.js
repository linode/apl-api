module.exports = {
  post: [
    function(req, res, next) {
      console.debug("Trigger deployment")
      res.status(200).json({});
    }
  ],
};

