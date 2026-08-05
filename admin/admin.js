"use strict";

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

let posts = [];
let selectedPostId = null;

function showLogin() {
  loginView.hidden = false;
  adminView.hidden = true;
}

function showAdmin() {
  loginView.hidden = true;
  adminView.hidden = false;
}

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

function clearEditor() {
  selectedPostId = null;

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
  ).textContent = "새 게시글";

  deleteButton.hidden = true;

  renderPostList();
}

function loadPostIntoEditor(post) {
  selectedPostId = post.id;

  document.getElementById(
    "post-id"
  ).value = post.id;

  document.getElementById(
    "post-title"
  ).value = post.title || "";

  document.getElementById(
    "post-author"
  ).value = post.author || "";

  document.getElementById(
    "post-date"
  ).value = post.date || "";

  document.getElementById(
    "post-category"
  ).value =
    post.category || "criticism";

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
    normalizeBody(post.body);

  document.getElementById(
    "editor-title"
  ).textContent = "게시글 수정";

  deleteButton.hidden = false;

  renderPostList();
}

function renderPostList() {
  postList.innerHTML = "";

  const sorted =
    [...posts].sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );

  sorted.forEach((post) => {
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

    button.innerHTML = `
      <span class="post-list-title">
        ${post.title}
      </span>

      <span class="post-list-meta">
        ${post.author} · ${post.date}
      </span>
    `;

    button.addEventListener(
      "click",
      () => {
        loadPostIntoEditor(post);
      }
    );

    postList.appendChild(button);
  });
}

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
      await response.json();

    if (data.authenticated) {
      showAdmin();
      await loadPosts();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

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
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      "게시글을 불러오지 못했습니다."
    );
  }

  posts =
    Array.isArray(data.posts)
      ? data.posts
      : [];

  renderPostList();
  clearEditor();

  saveMessage.textContent = "";
}

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

          body: JSON.stringify({
            password
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      loginMessage.textContent =
        data.error ||
        "로그인하지 못했습니다.";

      return;
    }

    loginMessage.textContent = "";

    showAdmin();
    await loadPosts();
  }
);

logoutButton.addEventListener(
  "click",
  async () => {
    await fetch(
      "/api/logout",
      {
        method: "POST",
        credentials:
          "same-origin"
      }
    );

    window.location.reload();
  }
);

newPostButton.addEventListener(
  "click",
  clearEditor
);

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

    const post = {
      id,

      title:
        document.getElementById(
          "post-title"
        ).value,

      author:
        document.getElementById(
          "post-author"
        ).value,

      date:
        document.getElementById(
          "post-date"
        ).value,

      category:
        document.getElementById(
          "post-category"
        ).value,

      subcategory:
        document.getElementById(
          "post-subcategory"
        ).value,

      thumbnail:
        document.getElementById(
          "post-thumbnail"
        ).value,

      imageCaption:
        document.getElementById(
          "post-image-caption"
        ).value,

      imageSource:
        document.getElementById(
          "post-image-source"
        ).value,

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

            body: JSON.stringify({
              action: "save",
              post
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "저장에 실패했습니다."
        );
      }

      posts = data.posts;
      selectedPostId = id;

      renderPostList();

      const saved =
        posts.find(
          (item) =>
            item.id === id
        );

      if (saved) {
        loadPostIntoEditor(saved);
      }

      saveMessage.textContent =
        "저장되었습니다. Vercel 재배포 후 사이트에 반영됩니다.";
    } catch (error) {
      saveMessage.textContent =
        error.message;
    }
  }
);

deleteButton.addEventListener(
  "click",
  async () => {
    if (!selectedPostId) return;

    const confirmed =
      window.confirm(
        "이 게시글을 삭제할까요?"
      );

    if (!confirmed) return;

    saveMessage.textContent =
      "삭제 중입니다.";

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

          body: JSON.stringify({
            action: "delete",
            id: selectedPostId
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      saveMessage.textContent =
        data.error ||
        "삭제에 실패했습니다.";

      return;
    }

    posts = data.posts;
    clearEditor();

    saveMessage.textContent =
      "삭제되었습니다.";
  }
);

/* 편집기 툴바 */

document
  .querySelectorAll(
    "[data-command]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        document.execCommand(
          button.dataset.command,
          false,
          null
        );

        bodyEditor.focus();
      }
    );
  });

document
  .querySelectorAll("[data-block]")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        document.execCommand(
          "formatBlock",
          false,
          button.dataset.block
        );

        bodyEditor.focus();
      }
    );
  });

document
  .getElementById("text-color")
  .addEventListener(
    "input",
    (event) => {
      document.execCommand(
        "foreColor",
        false,
        event.target.value
      );

      bodyEditor.focus();
    }
  );

document
  .getElementById(
    "background-color"
  )
  .addEventListener(
    "input",
    (event) => {
      document.execCommand(
        "hiliteColor",
        false,
        event.target.value
      );

      bodyEditor.focus();
    }
  );

document
  .getElementById("link-button")
  .addEventListener(
    "click",
    () => {
      const url =
        window.prompt(
          "링크 주소를 입력하세요."
        );

      if (!url) return;

      document.execCommand(
        "createLink",
        false,
        url
      );

      bodyEditor.focus();
    }
  );

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

      if (!subcategory.value) {
        subcategory.value =
          event.target.value
            .toUpperCase();
      }
    }
  );

checkSession();