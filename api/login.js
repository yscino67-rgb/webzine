const crypto =
  require("crypto");

const {
  createSessionCookie
} = require(
  "../lib/admin-auth"
);

function safeEqual(a, b) {
  const first =
    Buffer.from(String(a));

  const second =
    Buffer.from(String(b));

  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    first,
    second
  );
}

module.exports =
  async function handler(
    req,
    res
  ) {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({
          error:
            "허용되지 않은 요청입니다."
        });
    }

    const configuredPassword =
      process.env.ADMIN_PASSWORD;

    if (!configuredPassword) {
      return res
        .status(500)
        .json({
          error:
            "관리자 비밀번호가 설정되지 않았습니다."
        });
    }

    const password =
      req.body?.password || "";

    if (
      !safeEqual(
        password,
        configuredPassword
      )
    ) {
      return res
        .status(401)
        .json({
          error:
            "비밀번호가 올바르지 않습니다."
        });
    }

    res.setHeader(
      "Set-Cookie",
      createSessionCookie()
    );

    return res
      .status(200)
      .json({
        success: true
      });
  };