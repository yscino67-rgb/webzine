"use strict";

const POSTS_FILE_PATH =
  "content/posts.json";

/* =========================================================
   GitHub 환경변수 확인
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
   GitHub API 요청 헤더
========================================================= */

function createGitHubHeaders(token) {
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
   posts.json 읽기
========================================================= */

async function readPostsFile() {
  const {
    token,
    owner,
    repo,
    branch
  } = getGitHubSettings();

  const url =
    `https://api.github.com/repos/` +
    `${encodeURIComponent(owner)}/` +
    `${encodeURIComponent(repo)}/` +
    `contents/${POSTS_FILE_PATH}` +
    `?ref=${encodeURIComponent(branch)}`;

  const response = await fetch(url, {
    method: "GET",
    headers:
      createGitHubHeaders(token)
  });

  if (!response.ok) {
    const responseText =
      await response.text();

    throw new Error(
      `GitHub 파일 조회 실패: ` +
      `${response.status} ` +
      `${responseText}`
    );
  }

  const file = await response.json();

  if (!file.content || !file.sha) {
    throw new Error(
      "GitHub에서 posts.json 내용을 읽지 못했습니다."
    );
  }

  const decodedContent =
    Buffer.from(
      file.content.replace(/\n/g, ""),
      "base64"
    ).toString("utf8");

  let parsedData;

  try {
    parsedData =
      JSON.parse(decodedContent);
  } catch (error) {
    throw new Error(
      `posts.json JSON 해석 실패: ${error.message}`
    );
  }

  return {
    sha: file.sha,
    data: parsedData
  };
}

/* =========================================================
   posts.json 저장
========================================================= */

async function writePostsFile(
  data,
  sha,
  commitMessage
) {
  const {
    token,
    owner,
    repo,
    branch
  } = getGitHubSettings();

  const url =
    `https://api.github.com/repos/` +
    `${encodeURIComponent(owner)}/` +
    `${encodeURIComponent(repo)}/` +
    `contents/${POSTS_FILE_PATH}`;

  const formattedJson =
    JSON.stringify(
      data,
      null,
      2
    ) + "\n";

  const encodedContent =
    Buffer.from(
      formattedJson,
      "utf8"
    ).toString("base64");

  const requestBody = {
    message:
      commitMessage ||
      "Update posts from CMS",

    content:
      encodedContent,

    branch
  };

  if (sha) {
    requestBody.sha = sha;
  }

  const response = await fetch(url, {
    method: "PUT",

    headers:
      createGitHubHeaders(token),

    body:
      JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const responseText =
      await response.text();

    throw new Error(
      `GitHub 파일 저장 실패: ` +
      `${response.status} ` +
      `${responseText}`
    );
  }

  return response.json();
}

module.exports = {
  readPostsFile,
  writePostsFile
}; 