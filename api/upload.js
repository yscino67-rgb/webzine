"use strict";

const crypto =
  require("crypto");

const {
  isAuthenticated
} = require(
  "../lib/admin-auth"
);


/* =========================================================
   설정
========================================================= */

const UPLOAD_DIRECTORY =
  "images/uploads";

const MAX_FILE_SIZE =
  2.5 * 1024 * 1024;


/* =========================================================
   허용 이미지 형식
========================================================= */

const MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif"
};


/* =========================================================
   GitHub 환경변수
========================================================= */

function getGitHubSettings() {
  const token =
    process.env.GITHUB_TOKEN;

  const owner =
    process.env.GITHUB_OWNER;

  const repo =
    process.env.GITHUB_REPO;

  const branch =
    process.env.GITHUB_BRANCH ||
    "main";


  if (!token) {
    throw new Error(
      "GITHUB_TOKEN 환경변수가 설정되지 않았습니다."
    );
  }

  if (!owner) {
    throw new Error(
      "GITHUB_OWNER 환경변수가 설정되지 않았습니다."
    );
  }

  if (!repo) {
    throw new Error(
      "GITHUB_REPO 환경변수가 설정되지 않았습니다."
    );
  }


  return {
    token,
    owner,
    repo,
    branch
  };
}


/* =========================================================
   GitHub API 헤더
========================================================= */

function createGitHubHeaders(
  token
) {
  return {
    Accept:
      "application/vnd.github+json",

    Authorization:
      `Bearer ${token}`,

    "X-GitHub-Api-Version":
      "2022-11-28",

    "Content-Type":
      "application/json",

    "User-Agent":
      "hwengdan-cms"
  };
}


/* =========================================================
   파일명 생성

   같은 이름의 이미지가 충돌하지 않도록
   시간 + 랜덤 문자열 사용
========================================================= */

function createFileName(
  extension
) {
  const random =
    crypto
      .randomBytes(4)
      .toString("hex");

  return (
    `${Date.now()}-` +
    `${random}.` +
    `${extension}`
  );
}


/* =========================================================
   API
========================================================= */

module.exports =
async function handler(
  req,
  res
) {

  /* =======================================================
     로그인 확인
  ======================================================= */

  if (
    !isAuthenticated(req)
  ) {
    return res
      .status(401)
      .json({
        error:
          "로그인이 필요합니다."
      });
  }


  /* =======================================================
     POST만 허용
  ======================================================= */

  if (
    req.method !==
    "POST"
  ) {
    return res
      .status(405)
      .json({
        error:
          "허용되지 않은 요청입니다."
      });
  }


  try {

    /* =====================================================
       요청 데이터
    ===================================================== */

    const mimeType =
      String(
        req.body?.mimeType ||
        ""
      )
        .trim()
        .toLowerCase();


    const content =
      String(
        req.body?.content ||
        ""
      )
        .replace(
          /\s/g,
          ""
        );


    /* =====================================================
       이미지 형식 확인
    ===================================================== */

    const extension =
      MIME_TYPES[
        mimeType
      ];


    if (!extension) {
      return res
        .status(400)
        .json({
          error:
            "지원하지 않는 이미지 형식입니다."
        });
    }


    /* =====================================================
       이미지 데이터 확인
    ===================================================== */

    if (!content) {
      return res
        .status(400)
        .json({
          error:
            "업로드할 이미지 데이터가 없습니다."
        });
    }


    /* =====================================================
       Base64 → Buffer
    ===================================================== */

    const imageBuffer =
      Buffer.from(
        content,
        "base64"
      );


    if (
      !imageBuffer.length
    ) {
      return res
        .status(400)
        .json({
          error:
            "이미지를 읽지 못했습니다."
        });
    }


    /* =====================================================
       파일 크기 확인
    ===================================================== */

    if (
      imageBuffer.length >
      MAX_FILE_SIZE
    ) {
      return res
        .status(400)
        .json({
          error:
            "이미지는 2.5MB 이하로 업로드해 주세요."
        });
    }


    /* =====================================================
       GitHub 정보
    ===================================================== */

    const {
      token,
      owner,
      repo,
      branch
    } =
      getGitHubSettings();


    /* =====================================================
       파일 경로
    ===================================================== */

    const fileName =
      createFileName(
        extension
      );


    const filePath =
      `${UPLOAD_DIRECTORY}/${fileName}`;


    /* =====================================================
       GitHub Contents API 주소
    ===================================================== */

    const url =
      `https://api.github.com/repos/` +
      `${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/` +
      `contents/${filePath}`;


    /* =====================================================
       GitHub에 이미지 저장
    ===================================================== */

    const response =
      await fetch(
        url,
        {
          method:
            "PUT",

          headers:
            createGitHubHeaders(
              token
            ),

          body:
            JSON.stringify({
              message:
                `Upload image: ${fileName}`,

              content:
                imageBuffer
                  .toString(
                    "base64"
                  ),

              branch
            })
        }
      );


    /* =====================================================
       GitHub 오류
    ===================================================== */

    if (!response.ok) {
      const responseText =
        await response.text();


      throw new Error(
        `GitHub 이미지 저장 실패: ` +
        `${response.status} ` +
        `${responseText}`
      );
    }


    /* =====================================================
       성공

       article.js에서 바로 사용할 수 있도록
       사이트 루트 기준 경로 반환
    ===================================================== */

    return res
      .status(200)
      .json({
        success:
          true,

        path:
          `/${filePath}`
      });


  } catch (error) {

    console.error(
      "이미지 업로드 API 오류:",
      error
    );


    return res
      .status(500)
      .json({
        error:
          error.message ||
          "이미지 업로드에 실패했습니다."
      });
  }
};