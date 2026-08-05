"use strict";

/* =========================================================
   DOM 요소
========================================================= */

const loginView =
  document.getElementById(
    "login-view"
  );

const adminView =
  document.getElementById(
    "admin-view"
  );

const loginForm =
  document.getElementById(
    "login-form"
  );

const loginMessage =
  document.getElementById(
    "login-message"
  );

const logoutButton =
  document.getElementById(
    "logout-button"
  );

const postList =
  document.getElementById(
    "post-list"
  );

const postForm =
  document.getElementById(
    "post-form"
  );

const bodyEditor =
  document.getElementById(
    "body-editor"
  );

const editorToolbar =
  document.getElementById(
    "editor-toolbar"
  );

const newPostButton =
  document.getElementById(
    "new-post-button"
  );

const deleteButton =
  document.getElementById(
    "delete-post-button"
  );

const saveMessage =
  document.getElementById(
    "save-message"
  );

/* =========================================================
   상태값
========================================================= */

let posts = [];
let selectedPostId = null;

/*
  본문에서 마지막으로 선택한 글자 범위를 저장합니다.

  툴바의 색상 버튼을 누르면 브라우저가 본문의 선택 영역을
  해제할 수 있으므로, 선택 영역을 별도로 기억했다가 복원합니다.
*/
let savedEditorRange = null;

/* =========================================================
   화면 전환
========================================================= */

function showLogin() {
  loginView.hidden = false;
  adminView.hidden = true;
}

function showAdmin() {
  loginView.hidden = true;
  adminView.hidden = false;
}

/* =========================================================
   공통 함수
========================================================= */

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function createPostId() {
  return `article-${Date.now()}`;
}

function normalizeBody(body) {
  if (Array.isArray(body)) {
    return body.join("");
  }

  return String(body || "");
}

/*
  서버가 JSON 대신 오류 문구나 HTML을 반환해도
  JSON 파싱 오류로 전체 코드가 멈추지 않도록 처리합니다.
*/
async function readJsonResponse(
  response
) {
  const responseText =
    await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(
      responseText
    );
  } catch {
    return {
      error:
        response.ok
          ? "서버 응답을 읽지 못했습니다."
          : `서버 오류가 발생했습니다. 상태 코드: ${response.status}`
    };
  }
}

/* =========================================================
   본문 선택 영역 관리
========================================================= */

/*
  현재 선택 영역이 본문 편집기 안에 있는지 확인합니다.
*/
function isSelectionInsideEditor() {
  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) {
    return false;
  }

  const range =
    selection.getRangeAt(0);

  const commonNode =
    range.commonAncestorContainer;

  const targetElement =
    commonNode.nodeType ===
    Node.ELEMENT_NODE
      ? commonNode
      : commonNode.parentElement;

  return Boolean(
    targetElement &&
    (
      targetElement === bodyEditor ||
      bodyEditor.contains(
        targetElement
      )
    )
  );
}

/*
  본문에서 선택한 글자 범위를 저장합니다.
*/
function saveEditorSelection() {
  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0 ||
    !isSelectionInsideEditor()
  ) {
    return;
  }

  savedEditorRange =
    selection
      .getRangeAt(0)
      .cloneRange();
}

/*
  색상 버튼 등을 누르기 전 저장한 선택 영역을 복원합니다.
*/
function restoreEditorSelection() {
  bodyEditor.focus();

  if (!savedEditorRange) {
    return false;
  }

  const selection =
    window.getSelection();

  if (!selection) {
    return false;
  }

  try {
    selection.removeAllRanges();

    selection.addRange(
      savedEditorRange
    );

    return true;
  } catch (error) {
    console.error(
      "본문 선택 영역 복원 실패:",
      error
    );

    savedEditorRange = null;

    return false;
  }
}

/*
  본문 편집 후 현재 커서나 선택 영역을 다시 저장합니다.
*/
function refreshEditorSelection() {
  window.requestAnimationFrame(
    () => {
      saveEditorSelection();
    }
  );
}

/* =========================================================
   새 글 작성 화면 초기화
========================================================= */

function clearEditor() {
  selectedPostId = null;
  savedEditorRange = null;

  document.getElementById(
    "post-id"
  ).value = "";

  document.getElementById(
    "post-title"
  ).value = "";

  document.getElementById(
    "post-author"
  ).value = "";

  document.getElementById(
    "post-date"
  ).value = today();

  document.getElementById(
    "post-category"
  ).value = "criticism";

  document.getElementById(
    "post-subcategory"
  ).value = "CRITICISM";

  document.getElementById(
    "post-thumbnail"
  ).value = "";

  document.getElementById(
    "post-image-caption"
  ).value = "";

  document.getElementById(
    "post-image-source"
  ).value = "";

  document.getElementById(
    "post-published"
  ).checked = true;

  bodyEditor.innerHTML = "";

  document.getElementById(
    "editor-title"
  ).textContent =
    "새 게시글";

  deleteButton.hidden = true;

  saveMessage.textContent = "";

  renderPostList();
}

/* =========================================================
   기존 글 편집기에 불러오기
========================================================= */

function loadPostIntoEditor(post) {
  selectedPostId = post.id;
  savedEditorRange = null;

  document.getElementById(
    "post-id"
  ).value =
    post.id || "";

  document.getElementById(
    "post-title"
  ).value =
    post.title || "";

  document.getElementById(
    "post-author"
  ).value =
    post.author || "";

  document.getElementById(
    "post-date"
  ).value =
    post.date || "";

  document.getElementById(
    "post-category"
  ).value =
    post.category ||
    "criticism";

  document.getElementById(
    "post-subcategory"
  ).value =
    post.subcategory || "";

  document.getElementById(
    "post-thumbnail"
  ).value =
    post.thumbnail || "";

  document.getElementById(
    "post-image-caption"
  ).value =
    post.imageCaption || "";

  document.getElementById(
    "post-image-source"
  ).value =
    post.imageSource || "";

  document.getElementById(
    "post-published"
  ).checked =
    post.published !== false;

  bodyEditor.innerHTML =
    normalizeBody(
      post.body
    );

  document.getElementById(
    "editor-title"
  ).textContent =
    "게시글 수정";

  deleteButton.hidden = false;

  saveMessage.textContent = "";

  renderPostList();
}

/* =========================================================
   게시글 목록 출력
========================================================= */

function renderPostList() {
  postList.innerHTML = "";

  const sortedPosts =
    [...posts].sort(
      (firstPost, secondPost) => {
        return (
          new Date(
            secondPost.date
          ) -
          new Date(
            firstPost.date
          )
        );
      }
    );

  sortedPosts.forEach(
    (post) => {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "post-list-item";

      if (
        post.id ===
        selectedPostId
      ) {
        button.classList.add(
          "is-active"
        );
      }

      const title =
        document.createElement(
          "span"
        );

      title.className =
        "post-list-title";

      title.textContent =
        post.title ||
        "제목 없음";

      const meta =
        document.createElement(
          "span"
        );

      meta.className =
        "post-list-meta";

      meta.textContent =
        `${post.author || "작성자 없음"} · ${post.date || ""}`;

      button.append(
        title,
        meta
      );

      button.addEventListener(
        "click",
        () => {
          loadPostIntoEditor(
            post
          );
        }
      );

      postList.appendChild(
        button
      );
    }
  );
}

/* =========================================================
   로그인 상태 확인
========================================================= */

async function checkSession() {
  try {
    const response =
      await fetch(
        "/api/session",
        {
          credentials:
            "same-origin"
        }
      );

    const data =
      await readJsonResponse(
        response
      );

    if (
      response.ok &&
      data.authenticated
    ) {
      showAdmin();

      await loadPosts();

      return;
    }

    showLogin();
  } catch (error) {
    console.error(
      "세션 확인 실패:",
      error
    );

    showLogin();
  }
}

/* =========================================================
   게시글 목록 불러오기
========================================================= */

async function loadPosts() {
  saveMessage.textContent =
    "게시글을 불러오는 중입니다.";

  const response =
    await fetch(
      "/api/posts",
      {
        credentials:
          "same-origin"
      }
    );

  const data =
    await readJsonResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      data.error ||
      "게시글을 불러오지 못했습니다."
    );
  }

  posts =
    Array.isArray(
      data.posts
    )
      ? data.posts
      : [];

  renderPostList();

  clearEditor();

  saveMessage.textContent = "";
}

/* =========================================================
   로그인
========================================================= */

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    loginMessage.textContent =
      "로그인 중입니다.";

    const password =
      document.getElementById(
        "admin-password"
      ).value;

    try {
      const response =
        await fetch(
          "/api/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                password
              })
          }
        );

      const data =
        await readJsonResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
          "로그인하지 못했습니다."
        );
      }

      loginMessage.textContent = "";

      showAdmin();

      await loadPosts();
    } catch (error) {
      console.error(
        "로그인 실패:",
        error
      );

      loginMessage.textContent =
        error.message ||
        "로그인하지 못했습니다.";
    }
  }
);

/* =========================================================
   로그아웃
========================================================= */

logoutButton.addEventListener(
  "click",
  async () => {
    try {
      await fetch(
        "/api/logout",
        {
          method: "POST",

          credentials:
            "same-origin"
        }
      );
    } catch (error) {
      console.error(
        "로그아웃 요청 실패:",
        error
      );
    } finally {
      window.location.reload();
    }
  }
);

/* =========================================================
   새 글 버튼
========================================================= */

newPostButton.addEventListener(
  "click",
  clearEditor
);

/* =========================================================
   게시글 저장

   저장 버튼
   → GitHub posts.json 수정
   → GitHub 자동 커밋
   → Vercel 자동 배포
   → 사이트 자동 반영
========================================================= */

postForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    saveMessage.textContent =
      "저장 중입니다.";

    const id =
      document.getElementById(
        "post-id"
      ).value ||
      createPostId();

    const title =
      document.getElementById(
        "post-title"
      ).value.trim();

    const author =
      document.getElementById(
        "post-author"
      ).value.trim();

    const date =
      document.getElementById(
        "post-date"
      ).value;

    if (!title) {
      saveMessage.textContent =
        "제목을 입력해 주세요.";

      return;
    }

    if (!author) {
      saveMessage.textContent =
        "작성자를 입력해 주세요.";

      return;
    }

    if (!date) {
      saveMessage.textContent =
        "작성일을 입력해 주세요.";

      return;
    }

    const category =
      document.getElementById(
        "post-category"
      ).value;

    const subcategoryInput =
      document.getElementById(
        "post-subcategory"
      ).value.trim();

    const post = {
      id,

      title,

      author,

      date,

      category,

      subcategory:
        subcategoryInput ||
        category.toUpperCase(),

      thumbnail:
        document.getElementById(
          "post-thumbnail"
        ).value.trim(),

      imageAlt:
        title,

      imageCaption:
        document.getElementById(
          "post-image-caption"
        ).value.trim(),

      imageSource:
        document.getElementById(
          "post-image-source"
        ).value.trim(),

      published:
        document.getElementById(
          "post-published"
        ).checked,

      body:
        bodyEditor.innerHTML
    };

    try {
      const response =
        await fetch(
          "/api/posts",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                action: "save",
                post
              })
          }
        );

      const data =
        await readJsonResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
          "저장에 실패했습니다."
        );
      }

      posts =
        Array.isArray(
          data.posts
        )
          ? data.posts
          : posts;

      selectedPostId = id;

      renderPostList();

      const savedPost =
        posts.find(
          (item) =>
            item.id === id
        );

      if (savedPost) {
        loadPostIntoEditor(
          savedPost
        );
      }

      const articleUrl =
        `/html/article.html?id=${encodeURIComponent(id)}`;

      const archiveUrl =
        "/html/archive.html";

      saveMessage.innerHTML = "";

      const messageText =
        document.createElement(
          "span"
        );

      messageText.textContent =
        post.published
          ? "저장되었습니다. 잠시 후 사이트에 자동 반영됩니다. "
          : "비공개 상태로 저장되었습니다. ";

      const articleLink =
        document.createElement(
          "a"
        );

      articleLink.href =
        articleUrl;

      articleLink.target =
        "_blank";

      articleLink.rel =
        "noopener";

      articleLink.textContent =
        "글 확인하기";

      articleLink.style.textDecoration =
        "underline";

      articleLink.style.textUnderlineOffset =
        "3px";

      const separator =
        document.createTextNode(
          " · "
        );

      const archiveLink =
        document.createElement(
          "a"
        );

      archiveLink.href =
        archiveUrl;

      archiveLink.target =
        "_blank";

      archiveLink.rel =
        "noopener";

      archiveLink.textContent =
        "목록 확인하기";

      archiveLink.style.textDecoration =
        "underline";

      archiveLink.style.textUnderlineOffset =
        "3px";

      saveMessage.append(
        messageText,
        articleLink,
        separator,
        archiveLink
      );
    } catch (error) {
      console.error(
        "게시글 저장 실패:",
        error
      );

      saveMessage.textContent =
        error.message ||
        "저장에 실패했습니다.";
    }
  }
);

/* =========================================================
   게시글 삭제
========================================================= */

deleteButton.addEventListener(
  "click",
  async () => {
    if (!selectedPostId) {
      return;
    }

    const confirmed =
      window.confirm(
        "이 게시글을 삭제할까요?"
      );

    if (!confirmed) {
      return;
    }

    saveMessage.textContent =
      "삭제 중입니다.";

    try {
      const response =
        await fetch(
          "/api/posts",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                action:
                  "delete",

                id:
                  selectedPostId
              })
          }
        );

      const data =
        await readJsonResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
          "삭제에 실패했습니다."
        );
      }

      posts =
        Array.isArray(
          data.posts
        )
          ? data.posts
          : [];

      clearEditor();

      saveMessage.textContent =
        "삭제되었습니다. 잠시 후 사이트에서도 자동으로 삭제됩니다.";
    } catch (error) {
      console.error(
        "게시글 삭제 실패:",
        error
      );

      saveMessage.textContent =
        error.message ||
        "삭제에 실패했습니다.";
    }
  }
);

/* =========================================================
   본문 선택 영역 감지
========================================================= */

document.addEventListener(
  "selectionchange",
  () => {
    if (
      document.activeElement ===
        bodyEditor ||
      isSelectionInsideEditor()
    ) {
      saveEditorSelection();
    }
  }
);

bodyEditor.addEventListener(
  "mouseup",
  saveEditorSelection
);

bodyEditor.addEventListener(
  "keyup",
  saveEditorSelection
);

bodyEditor.addEventListener(
  "touchend",
  saveEditorSelection
);

bodyEditor.addEventListener(
  "input",
  refreshEditorSelection
);

/* =========================================================
   툴바 클릭 시 본문 선택 영역이 해제되는 것 방지
========================================================= */

if (editorToolbar) {
  editorToolbar
    .querySelectorAll(
      "button"
    )
    .forEach((button) => {
      button.addEventListener(
        "mousedown",
        (event) => {
          /*
            버튼을 눌렀을 때 브라우저 포커스가
            본문에서 툴바로 이동하지 않도록 합니다.
          */
          event.preventDefault();
        }
      );
    });
}

/* =========================================================
   기본 편집 명령

   굵게, 기울임, 밑줄, 취소선,
   목록, 정렬, 실행 취소, 다시 실행
========================================================= */

document
  .querySelectorAll(
    "[data-command]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        restoreEditorSelection();

        document.execCommand(
          button.dataset.command,
          false,
          null
        );

        refreshEditorSelection();
      }
    );
  });

/* =========================================================
   문단 형식

   P, H2, 인용문
========================================================= */

document
  .querySelectorAll(
    "[data-block]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        restoreEditorSelection();

        document.execCommand(
          "formatBlock",
          false,
          button.dataset.block
        );

        refreshEditorSelection();
      }
    );
  });

/* =========================================================
   글자색

   HTML에는 아래 네 가지 버튼이 있어야 합니다.

   data-text-color="#111111"
   data-text-color="#e12727"
   data-text-color="#2457d6"
   data-text-color="#16834b"
========================================================= */

document
  .querySelectorAll(
    "[data-text-color]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const color =
          button.dataset.textColor;

        if (!color) {
          return;
        }

        const restored =
          restoreEditorSelection();

        if (!restored) {
          saveMessage.textContent =
            "색을 바꿀 글자를 먼저 드래그해 주세요.";

          return;
        }

        /*
          font 태그 대신
          style="color: ..." 형태로 저장되도록 합니다.
        */
        document.execCommand(
          "styleWithCSS",
          false,
          true
        );

        document.execCommand(
          "foreColor",
          false,
          color
        );

        saveMessage.textContent = "";

        refreshEditorSelection();
      }
    );
  });

/* =========================================================
   링크 삽입
========================================================= */

document
  .getElementById(
    "link-button"
  )
  .addEventListener(
    "click",
    () => {
      /*
        prompt가 뜨기 전에 선택 영역을 저장합니다.
      */
      saveEditorSelection();

      const url =
        window.prompt(
          "링크 주소를 입력하세요."
        );

      if (!url) {
        return;
      }

      const restored =
        restoreEditorSelection();

      if (!restored) {
        saveMessage.textContent =
          "링크를 적용할 글자를 먼저 드래그해 주세요.";

        return;
      }

      document.execCommand(
        "createLink",
        false,
        url
      );

      saveMessage.textContent = "";

      refreshEditorSelection();
    }
  );

/* =========================================================
   카테고리 변경 시 세부 카테고리 자동 입력
========================================================= */

document
  .getElementById(
    "post-category"
  )
  .addEventListener(
    "change",
    (event) => {
      const subcategory =
        document.getElementById(
          "post-subcategory"
        );

      subcategory.value =
        event.target.value
          .toUpperCase();
    }
  );

/* =========================================================
   실행
========================================================= */

checkSession();