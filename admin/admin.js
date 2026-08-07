"use strict";

/* =========================================================
   DOM
========================================================= */

const loginView =
  document.getElementById("login-view");

const adminView =
  document.getElementById("admin-view");

const loginForm =
  document.getElementById("login-form");

const loginMessage =
  document.getElementById("login-message");

const logoutButton =
  document.getElementById("logout-button");

const postList =
  document.getElementById("post-list");

const postForm =
  document.getElementById("post-form");

const bodyEditor =
  document.getElementById("body-editor");

const editorToolbar =
  document.getElementById("editor-toolbar");

const newPostButton =
  document.getElementById("new-post-button");

const deleteButton =
  document.getElementById("delete-post-button");

const saveMessage =
  document.getElementById("save-message");

const thumbnailInput =
  document.getElementById("post-thumbnail");

const thumbnailFileInput =
  document.getElementById("post-thumbnail-file");

const imageUploadButton =
  document.getElementById("image-upload-button");

const imageUploadStatus =
  document.getElementById("image-upload-status");

const imagePreviewWrap =
  document.getElementById("image-upload-preview-wrap");

const imagePreview =
  document.getElementById("image-upload-preview");

const imageRemoveButton =
  document.getElementById("image-remove-button");

const footnoteButton =
  document.getElementById("footnote-button");

const smallTextButton =
  document.getElementById("small-text-button");

const footnotePanel =
  document.getElementById("footnote-editor-panel");

const footnoteText =
  document.getElementById("footnote-editor-text");

const footnoteSaveButton =
  document.getElementById("footnote-editor-save");

const footnoteDeleteButton =
  document.getElementById("footnote-editor-delete");

const footnoteCloseButton =
  document.getElementById("footnote-editor-close");

/* =========================================================
   상태
========================================================= */

let posts = [];
let selectedPostId = null;

let savedEditorRange = null;

let activeFootnoteWrap = null;

/* =========================================================
   화면
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
   공통
========================================================= */

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function createPostId() {
  return `article-${Date.now()}`;
}

function createFootnoteId() {
  return (
    `footnote-${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

function normalizeBody(body) {
  if (
    Array.isArray(body)
  ) {
    return body.join("");
  }

  return String(
    body || ""
  );
}

async function readJsonResponse(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error:
        response.ok
          ? "서버 응답을 읽지 못했습니다."
          : `서버 오류: ${response.status}`
    };
  }
}

/* =========================================================
   선택 영역
========================================================= */

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

  const node =
    range.commonAncestorContainer;

  const element =
    node.nodeType ===
    Node.ELEMENT_NODE
      ? node
      : node.parentElement;

  return Boolean(
    element &&
    (
      element === bodyEditor ||
      bodyEditor.contains(
        element
      )
    )
  );
}

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
  } catch {
    return false;
  }
}

function refreshEditorSelection() {
  requestAnimationFrame(
    saveEditorSelection
  );
}

/* =========================================================
   이미지
========================================================= */

function showImagePreview(
  src
) {
  if (!src) {
    imagePreviewWrap.hidden =
      true;

    imagePreview.removeAttribute(
      "src"
    );

    return;
  }

  imagePreview.src = src;

  imagePreviewWrap.hidden =
    false;
}

function fileToBase64(file) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.onload =
        () => {
          const result =
            String(
              reader.result || ""
            );

          const comma =
            result.indexOf(",");

          if (comma < 0) {
            reject(
              new Error(
                "이미지를 읽지 못했습니다."
              )
            );

            return;
          }

          resolve(
            result.slice(
              comma + 1
            )
          );
        };

      reader.onerror =
        () => {
          reject(
            new Error(
              "이미지를 읽지 못했습니다."
            )
          );
        };

      reader.readAsDataURL(
        file
      );
    }
  );
}

async function uploadSelectedImage() {
  const file =
    thumbnailFileInput
      .files?.[0];

  if (!file) {
    imageUploadStatus.textContent =
      "업로드할 이미지를 선택해 주세요.";

    return;
  }

  if (
    file.size >
    2.5 * 1024 * 1024
  ) {
    imageUploadStatus.textContent =
      "이미지는 2.5MB 이하로 선택해 주세요.";

    return;
  }

  imageUploadStatus.textContent =
    "이미지 업로드 중입니다.";

  imageUploadButton.disabled =
    true;

  try {
    const content =
      await fileToBase64(
        file
      );

    const response =
      await fetch(
        "/api/upload",
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
              mimeType:
                file.type,

              content
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
        "이미지 업로드에 실패했습니다."
      );
    }

    thumbnailInput.value =
      data.path || "";

    showImagePreview(
      data.path
    );

    imageUploadStatus.textContent =
      "이미지가 업로드되었습니다.";
  } catch (error) {
    console.error(error);

    imageUploadStatus.textContent =
      error.message ||
      "이미지 업로드에 실패했습니다.";
  } finally {
    imageUploadButton.disabled =
      false;
  }
}

imageUploadButton.addEventListener(
  "click",
  uploadSelectedImage
);

thumbnailFileInput.addEventListener(
  "change",
  () => {
    const file =
      thumbnailFileInput
        .files?.[0];

    if (!file) {
      return;
    }

    const previewUrl =
      URL.createObjectURL(
        file
      );

    showImagePreview(
      previewUrl
    );

    imageUploadStatus.textContent =
      "파일 선택됨. 이미지 업로드를 눌러 주세요.";
  }
);

imageRemoveButton.addEventListener(
  "click",
  () => {
    thumbnailInput.value = "";

    thumbnailFileInput.value =
      "";

    imageUploadStatus.textContent =
      "대표 이미지를 제거했습니다.";

    showImagePreview("");
  }
);

/* =========================================================
   새 글
========================================================= */

function clearEditor() {
  selectedPostId = null;

  savedEditorRange = null;

  activeFootnoteWrap = null;

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
    "post-author-bio"
  ).value = "";

  document.getElementById(
    "post-date"
  ).value = today();

  document.getElementById(
    "post-category"
  ).value =
    "criticism";

  document.getElementById(
    "post-subcategory"
  ).value =
    "CRITICISM";

  thumbnailInput.value = "";

  thumbnailFileInput.value =
    "";

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

  imageUploadStatus.textContent =
    "";

  showImagePreview("");

  footnotePanel.hidden = true;

  document.getElementById(
    "editor-title"
  ).textContent =
    "새 게시글";

  deleteButton.hidden = true;

  saveMessage.textContent = "";

  renderPostList();
}

/* =========================================================
   글 불러오기
========================================================= */

function loadPostIntoEditor(
  post
) {
  selectedPostId =
    post.id;

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
    "post-author-bio"
  ).value =
    post.authorBio || "";

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

  thumbnailInput.value =
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

  showImagePreview(
    post.thumbnail || ""
  );

  imageUploadStatus.textContent =
    "";

  footnotePanel.hidden = true;

  document.getElementById(
    "editor-title"
  ).textContent =
    "게시글 수정";

  deleteButton.hidden = false;

  saveMessage.textContent = "";

  renderPostList();
}

/* =========================================================
   목록
========================================================= */

function renderPostList() {
  postList.innerHTML = "";

  const sorted =
    [...posts].sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );

  sorted.forEach(
    (post) => {
      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

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
        () =>
          loadPostIntoEditor(
            post
          )
      );

      postList.appendChild(
        button
      );
    }
  );
}

/* =========================================================
   로그인 상태
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
    console.error(error);

    showLogin();
  }
}

/* =========================================================
   게시글 로드
========================================================= */

async function loadPosts() {
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

  clearEditor();
}

/* =========================================================
   로그인
========================================================= */

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const password =
      document.getElementById(
        "admin-password"
      ).value;

    loginMessage.textContent =
      "로그인 중입니다.";

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

      loginMessage.textContent =
        "";

      showAdmin();

      await loadPosts();
    } catch (error) {
      loginMessage.textContent =
        error.message;
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
   기본 편집 명령
========================================================= */

document
  .querySelectorAll(
    "[data-command]"
  )
  .forEach(
    (button) => {
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
    }
  );

/* =========================================================
   P / H2 / 인용
========================================================= */

document
  .querySelectorAll(
    "[data-block]"
  )
  .forEach(
    (button) => {
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
    }
  );

/* =========================================================
   글자색
========================================================= */

document
  .querySelectorAll(
    "[data-text-color]"
  )
  .forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const color =
            button.dataset
              .textColor;

          if (
            !restoreEditorSelection()
          ) {
            saveMessage.textContent =
              "색을 바꿀 글자를 먼저 선택해 주세요.";

            return;
          }

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

          saveMessage.textContent =
            "";

          refreshEditorSelection();
        }
      );
    }
  );

/* =========================================================
   작은 글씨
========================================================= */

smallTextButton.addEventListener(
  "click",
  () => {
    if (
      !restoreEditorSelection()
    ) {
      saveMessage.textContent =
        "작게 만들 글자를 먼저 선택해 주세요.";

      return;
    }

    document.execCommand(
      "fontSize",
      false,
      "2"
    );

    bodyEditor
      .querySelectorAll(
        'font[size="2"]'
      )
      .forEach(
        (font) => {
          const span =
            document.createElement(
              "span"
            );

          span.className =
            "cms-small-text";

          while (
            font.firstChild
          ) {
            span.appendChild(
              font.firstChild
            );
          }

          font.replaceWith(
            span
          );
        }
      );

    saveMessage.textContent =
      "";

    refreshEditorSelection();
  }
);

/* =========================================================
   링크
========================================================= */

document.getElementById(
  "link-button"
).addEventListener(
  "click",
  () => {
    saveEditorSelection();

    const url =
      window.prompt(
        "링크 주소를 입력하세요."
      );

    if (!url) {
      return;
    }

    if (
      !restoreEditorSelection()
    ) {
      return;
    }

    document.execCommand(
      "createLink",
      false,
      url
    );

    refreshEditorSelection();
  }
);

/* =========================================================
   참고문헌 / 각주
========================================================= */

function openFootnoteEditor(wrap) {
  if (!wrap) {
    return;
  }

  activeFootnoteWrap = wrap;

  const popover =
    wrap.querySelector(
      ".footnote-popover"
    );

  footnoteText.value =
    popover
      ? popover.textContent.trim()
      : "";

  footnotePanel.hidden = false;

  window.requestAnimationFrame(() => {
    footnoteText.focus();
  });
}

function closeFootnoteEditor() {
  activeFootnoteWrap = null;

  footnoteText.value = "";

  footnotePanel.hidden = true;
}

/* =========================================================
   현재 본문 커서 위치 가져오기
========================================================= */

function getFootnoteInsertRange() {
  /*
    이전에 저장해 둔 본문 커서 위치가 있으면
    그 위치를 사용합니다.
  */
  if (savedEditorRange) {
    try {
      const range =
        savedEditorRange.cloneRange();

      const container =
        range.commonAncestorContainer;

      const element =
        container.nodeType === Node.ELEMENT_NODE
          ? container
          : container.parentElement;

      if (
        element &&
        (
          element === bodyEditor ||
          bodyEditor.contains(element)
        )
      ) {
        return range;
      }
    } catch (error) {
      console.error(
        "저장된 커서 위치 확인 실패:",
        error
      );
    }
  }

  /*
    현재 실제 selection이 본문 안에 있다면 사용합니다.
  */
  const selection =
    window.getSelection();

  if (
    selection &&
    selection.rangeCount > 0
  ) {
    const range =
      selection.getRangeAt(0);

    const container =
      range.commonAncestorContainer;

    const element =
      container.nodeType === Node.ELEMENT_NODE
        ? container
        : container.parentElement;

    if (
      element &&
      (
        element === bodyEditor ||
        bodyEditor.contains(element)
      )
    ) {
      return range.cloneRange();
    }
  }

  return null;
}

/* =========================================================
   각주 삽입
========================================================= */

function insertFootnote() {
  const range =
    getFootnoteInsertRange();

  if (!range) {
    saveMessage.textContent =
      "본문에서 각주를 넣을 위치를 한 번 클릭한 뒤 각주 버튼을 눌러 주세요.";

    bodyEditor.focus();

    return;
  }

  saveMessage.textContent = "";

  const footnoteId =
    createFootnoteId();

  /* -------------------------
     각주 전체 묶음
  ------------------------- */

  const unit =
    document.createElement(
      "span"
    );

  unit.className =
    "footnote-unit";

  unit.setAttribute(
    "contenteditable",
    "false"
  );

  /* -------------------------
     파란 네모 + 팝오버 묶음
  ------------------------- */

  const wrap =
    document.createElement(
      "span"
    );

  wrap.className =
    "footnote-wrap";

  /* -------------------------
     파란 네모 버튼
  ------------------------- */

  const marker =
    document.createElement(
      "button"
    );

  marker.type =
    "button";

  marker.className =
    "footnote-marker";

  marker.setAttribute(
    "aria-label",
    "참고문헌 보기"
  );

  marker.setAttribute(
    "aria-expanded",
    "false"
  );

  marker.setAttribute(
    "aria-controls",
    footnoteId
  );

  /* -------------------------
     참고문헌 내용
  ------------------------- */

  const popover =
    document.createElement(
      "span"
    );

  popover.className =
    "footnote-popover";

  popover.id =
    footnoteId;

  popover.setAttribute(
    "role",
    "note"
  );

  popover.hidden = true;

  /* -------------------------
     마침표
  ------------------------- */

  const period =
    document.createElement(
      "span"
    );

  period.className =
    "footnote-period";

  period.textContent =
    ".";

  /* -------------------------
     DOM 결합
  ------------------------- */

  wrap.append(
    marker,
    popover
  );

  unit.append(
    wrap,
    period
  );

  /* -------------------------
     본문의 현재 커서 위치에 삽입
  ------------------------- */

  range.deleteContents();

  range.insertNode(
    unit
  );

  /*
    각주 다음에 커서를 계속 사용할 수 있도록
    공백 텍스트 하나를 추가합니다.
  */

  const spacer =
    document.createTextNode(
      "\u00A0"
    );

  unit.after(
    spacer
  );

  const selection =
    window.getSelection();

  const nextRange =
    document.createRange();

  nextRange.setStartAfter(
    spacer
  );

  nextRange.collapse(true);

  selection.removeAllRanges();

  selection.addRange(
    nextRange
  );

  savedEditorRange =
    nextRange.cloneRange();

  /*
    방금 생성한 각주의 참고문헌 입력창을
    즉시 엽니다.
  */

  openFootnoteEditor(
    unit
  );
}

/* =========================================================
   각주 버튼

   mousedown 단계에서 본문 커서 위치를 먼저 보존합니다.
========================================================= */

if (footnoteButton) {
  footnoteButton.addEventListener(
    "mousedown",
    (event) => {
      event.preventDefault();

      /*
        현재 본문 selection을 잃기 전에 저장
      */
      if (
        isSelectionInsideEditor()
      ) {
        saveEditorSelection();
      }
    }
  );

  footnoteButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      insertFootnote();
    }
  );
}

/* =========================================================
   CMS 본문에 이미 들어간 파란 네모 클릭
   → 해당 참고문헌 다시 편집
========================================================= */

bodyEditor.addEventListener(
  "click",
  (event) => {
    const marker =
      event.target.closest(
        ".footnote-marker"
      );

    if (!marker) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const unit =
      marker.closest(
        ".footnote-unit"
      ) ||
      marker.closest(
        ".footnote-wrap"
      );

    if (!unit) {
      return;
    }

    openFootnoteEditor(
      unit
    );
  }
);

/* =========================================================
   참고문헌 적용
========================================================= */

if (footnoteSaveButton) {
  footnoteSaveButton.addEventListener(
    "click",
    () => {
      if (!activeFootnoteWrap) {
        return;
      }

      const popover =
        activeFootnoteWrap.querySelector(
          ".footnote-popover"
        );

      if (!popover) {
        return;
      }

      const value =
        footnoteText.value.trim();

      if (!value) {
        saveMessage.textContent =
          "참고문헌 내용을 입력해 주세요.";

        return;
      }

      popover.textContent =
        value;

      saveMessage.textContent =
        "";

      closeFootnoteEditor();

      bodyEditor.focus();
    }
  );
}

/* =========================================================
   각주 삭제
========================================================= */

if (footnoteDeleteButton) {
  footnoteDeleteButton.addEventListener(
    "click",
    () => {
      if (!activeFootnoteWrap) {
        return;
      }

      activeFootnoteWrap.remove();

      closeFootnoteEditor();

      bodyEditor.focus();
    }
  );
}

/* =========================================================
   참고문헌 편집창 닫기
========================================================= */

if (footnoteCloseButton) {
  footnoteCloseButton.addEventListener(
    "click",
    () => {
      closeFootnoteEditor();
    }
  );
}

/* =========================================================
   선택 영역 추적
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

/* 툴바 클릭 때문에 selection이 풀리지 않게 */

editorToolbar
  .querySelectorAll(
    "button"
  )
  .forEach(
    (button) => {
      button.addEventListener(
        "mousedown",
        (event) => {
          event.preventDefault();
        }
      );
    }
  );

/* =========================================================
   카테고리
========================================================= */

document.getElementById(
  "post-category"
).addEventListener(
  "change",
  (event) => {
    document.getElementById(
      "post-subcategory"
    ).value =
      event.target.value
        .toUpperCase();
  }
);

/* =========================================================
   저장
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

    if (
      !title ||
      !author ||
      !date
    ) {
      saveMessage.textContent =
        "제목, 작성자, 날짜를 입력해 주세요.";

      return;
    }

    const category =
      document.getElementById(
        "post-category"
      ).value;

    const subcategory =
      document.getElementById(
        "post-subcategory"
      ).value.trim();

    const post = {
      id,

      title,

      author,

      authorBio:
        document.getElementById(
          "post-author-bio"
        ).value.trim(),

      date,

      category,

      subcategory:
        subcategory ||
        category.toUpperCase(),

      thumbnail:
        thumbnailInput.value.trim(),

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
                action:
                  "save",

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

      saveMessage.textContent =
        "저장되었습니다. 잠시 후 사이트에 자동 반영됩니다.";
    } catch (error) {
      console.error(error);

      saveMessage.textContent =
        error.message ||
        "저장에 실패했습니다.";
    }
  }
);

/* =========================================================
   삭제
========================================================= */

deleteButton.addEventListener(
  "click",
  async () => {
    if (!selectedPostId) {
      return;
    }

    if (
      !window.confirm(
        "이 게시글을 삭제할까요?"
      )
    ) {
      return;
    }

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
        "삭제되었습니다.";
    } catch (error) {
      saveMessage.textContent =
        error.message;
    }
  }
);

/* =========================================================
   실행
========================================================= */

checkSession();