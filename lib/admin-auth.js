"use strict";

const crypto = require("crypto");

const COOKIE_NAME = "hwengdan_admin";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

/* =========================================================
   환경변수 확인
========================================================= */

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET 환경변수가 설정되지 않았습니다."
    );
  }

  return secret;
}

/* =========================================================
   문자열 서명
========================================================= */

function sign(value) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

/* =========================================================
   관리자 로그인 쿠키 생성
========================================================= */

function createSessionCookie() {
  const session = {
    expires:
      Date.now() +
      SESSION_DURATION_SECONDS * 1000
  };

  const payload = Buffer.from(
    JSON.stringify(session),
    "utf8"
  ).toString("base64url");

  const signature = sign(payload);

  const token =
    `${payload}.${signature}`;

  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_DURATION_SECONDS}`
  ].join("; ");
}

/* =========================================================
   로그아웃용 쿠키 제거
========================================================= */

function clearSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0"
  ].join("; ");
}

/* =========================================================
   요청 쿠키 읽기
========================================================= */

function getCookieValue(req) {
  const cookieHeader =
    String(req.headers.cookie || "");

  if (!cookieHeader) {
    return "";
  }

  const cookies = cookieHeader
    .split(";")
    .map((item) => item.trim());

  const targetCookie = cookies.find(
    (item) =>
      item.startsWith(`${COOKIE_NAME}=`)
  );

  if (!targetCookie) {
    return "";
  }

  return targetCookie.slice(
    COOKIE_NAME.length + 1
  );
}

/* =========================================================
   안전한 문자열 비교
========================================================= */

function safeEqual(firstValue, secondValue) {
  const first = Buffer.from(
    String(firstValue)
  );

  const second = Buffer.from(
    String(secondValue)
  );

  if (first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    first,
    second
  );
}

/* =========================================================
   로그인 상태 확인
========================================================= */

function isAuthenticated(req) {
  try {
    const token = getCookieValue(req);

    if (!token) {
      return false;
    }

    const [payload, signature] =
      token.split(".");

    if (!payload || !signature) {
      return false;
    }

    const expectedSignature =
      sign(payload);

    if (
      !safeEqual(
        signature,
        expectedSignature
      )
    ) {
      return false;
    }

    const decodedSession =
      Buffer.from(
        payload,
        "base64url"
      ).toString("utf8");

    const session =
      JSON.parse(decodedSession);

    const expires =
      Number(session.expires);

    if (!Number.isFinite(expires)) {
      return false;
    }

    return expires > Date.now();
  } catch (error) {
    console.error(
      "관리자 세션 확인 오류:",
      error
    );

    return false;
  }
}

module.exports = {
  createSessionCookie,
  clearSessionCookie,
  isAuthenticated
};