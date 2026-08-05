const {
  isAuthenticated
} = require(
  "../lib/admin-auth"
);

module.exports =
  async function handler(
    req,
    res
  ) {
    return res
      .status(200)
      .json({
        authenticated:
          isAuthenticated(req)
      });
  };