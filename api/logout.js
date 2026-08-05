const {
  clearSessionCookie
} = require(
  "../lib/admin-auth"
);

module.exports =
  async function handler(
    req,
    res
  ) {
    res.setHeader(
      "Set-Cookie",
      clearSessionCookie()
    );

    return res
      .status(200)
      .json({
        success: true
      });
  };