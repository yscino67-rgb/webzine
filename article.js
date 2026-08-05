"use strict";

const articleDetail =
  document.getElementById("article-detail");

const POSTS_URL =
  "../content/posts.json";

function getArticleId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("id");
}

function createImageMarkup(post) {
  if (!post.thumbnail) {
    return `
      <figure class="article-visual article-visual--placeholder">
        <div class="article-image-placeholder">
          IMAGE<br />
          수정중
        </div>

        <figcaption class="article-caption">
          ${post.imageCaption || "이미지 및 출처 수정중"}
        </figcaption>
      </figure>
    `;
  }

  const sourceMarkup =
    post.imageSource
      ? `<br />(출처: ${post.imageSource})`
      : "";

  return `
    <figure class="article-visual">
      <img
        src="${post.thumbnail}"
        alt="${post.imageAlt || post.title}"
        class="article-image"
      />

      <figcaption class="article-caption">
        ${post.imageCaption || ""}
        ${sourceMarkup}
      </figcaption>
    </figure>
  `;
}

function renderArticle(post) {
  if (!articleDetail) return;

  document.title =
    post.title || "Magazine Article";

  const bodyHtml =
    Array.isArray(post.body)
      ? post.body.join("")
      : String(post.body || "");

  articleDetail.innerHTML = `
    <header class="article-header">
      <h1 class="article-title">
        ${post.title || ""}
      </h1>
    </header>

    <div class="article-layout">
      <section class="article-copy">
        <div class="article-body">
          ${bodyHtml}
        </div>

        <footer class="article-footer">
          <a
            href="./archive.html"
            class="back-link"
          >
            ← INDEX
          </a>
        </footer>
      </section>

      ${createImageMarkup(post)}
    </div>
  `;

  initializeFootnotes();
}

function initializeFootnotes() {
  const markers =
    document.querySelectorAll(
      ".footnote-marker"
    );

  function closeAllFootnotes() {
    markers.forEach((marker) => {
      const footnoteId =
        marker.getAttribute(
          "aria-controls"
        );

      if (!footnoteId) return;

      const footnote =
        document.getElementById(
          footnoteId
        );

      if (!footnote) return;

      footnote.hidden = true;

      marker.setAttribute(
        "aria-expanded",
        "false"
      );
    });
  }

  markers.forEach((marker) => {
    marker.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const footnoteId =
          marker.getAttribute(
            "aria-controls"
          );

        if (!footnoteId) return;

        const footnote =
          document.getElementById(
            footnoteId
          );

        if (!footnote) return;

        const isOpen =
          marker.getAttribute(
            "aria-expanded"
          ) === "true";

        closeAllFootnotes();

        if (!isOpen) {
          footnote.hidden = false;

          marker.setAttribute(
            "aria-expanded",
            "true"
          );
        }
      }
    );
  });

  document.addEventListener(
    "click",
    closeAllFootnotes
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeAllFootnotes();
      }
    }
  );
}

async function loadArticle() {
  if (!articleDetail) return;

  const articleId =
    getArticleId();

  if (!articleId) {
    articleDetail.innerHTML = `
      <p class="article-error">
        기사 주소가 올바르지 않습니다.
      </p>

      <a
        href="./archive.html"
        class="back-link"
      >
        ← INDEX
      </a>
    `;

    return;
  }

  try {
    const response = await fetch(
      `${POSTS_URL}?v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `게시글 요청 실패: ${response.status}`
      );
    }

    const data =
      await response.json();

    const posts =
      Array.isArray(data.posts)
        ? data.posts
        : [];

    const post =
      posts.find((item) => {
        return (
          item.id === articleId &&
          item.published !== false
        );
      });

    if (!post) {
      articleDetail.innerHTML = `
        <p class="article-error">
          존재하지 않거나 공개되지 않은 기사입니다.
        </p>

        <a
          href="./archive.html"
          class="back-link"
        >
          ← INDEX
        </a>
      `;

      return;
    }

    renderArticle(post);
  } catch (error) {
    console.error(error);

    articleDetail.innerHTML = `
      <p class="article-error">
        기사를 불러오지 못했습니다.
      </p>

      <a
        href="./archive.html"
        class="back-link"
      >
        ← INDEX
      </a>
    `;
  }
}

loadArticle();