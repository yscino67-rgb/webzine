"use strict";

const articleDetail =
  document.getElementById(
    "article-detail"
  );

const POSTS_URL =
  "../content/posts.json";

/* =========================================================
   기사 ID
========================================================= */

function getArticleId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("id");
}

/* =========================================================
   HTML 문자 이스케이프
========================================================= */

function escapeHtml(value) {
  return String(
    value || ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

/* =========================================================
   이미지
========================================================= */

function createImageMarkup(
  post
) {
  if (!post.thumbnail) {
    return `
      <figure class="article-visual">
        <div class="article-image-placeholder">
          IMAGE<br />
          수정중
        </div>

        <figcaption class="article-caption">
          ${
            escapeHtml(
              post.imageCaption ||
              "이미지 및 출처 수정중"
            )
          }
        </figcaption>
      </figure>
    `;
  }

  const source =
    post.imageSource
      ? `<br />(출처: ${escapeHtml(post.imageSource)})`
      : "";

  return `
    <figure class="article-visual">
      <img
        class="article-image"
        src="${escapeHtml(post.thumbnail)}"
        alt="${escapeHtml(post.imageAlt || post.title)}"
      />

      <figcaption class="article-caption">
        ${escapeHtml(post.imageCaption || "")}
        ${source}
      </figcaption>
    </figure>
  `;
}

/* =========================================================
   작성자 소개
========================================================= */

function createAuthorMarkup(
  post
) {
  if (
    !post.author &&
    !post.authorBio
  ) {
    return "";
  }

  return `
    <aside
      class="article-author-profile"
      aria-label="작성자 소개"
    >
      <div class="article-author-name">
        ${escapeHtml(post.author || "")}
      </div>

      ${
        post.authorBio
          ? `
            <p class="article-author-bio">
              ${escapeHtml(post.authorBio)}
            </p>
          `
          : ""
      }
    </aside>
  `;
}

/* =========================================================
   기사 출력
========================================================= */

function renderArticle(
  post
) {
  if (!articleDetail) {
    return;
  }

  document.title =
    post.title ||
    "Magazine Article";

  const bodyHtml =
    Array.isArray(
      post.body
    )
      ? post.body.join("")
      : String(
          post.body || ""
        );

  articleDetail.innerHTML = `
    <header class="article-header">
      <h1 class="article-title">
        ${escapeHtml(post.title || "")}
      </h1>
    </header>

    <div class="article-layout">
      <section class="article-copy">
        <div class="article-body">
          ${bodyHtml}
        </div>

        ${createAuthorMarkup(post)}

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

/* =========================================================
   각주
========================================================= */

function initializeFootnotes() {
  const markers =
    document.querySelectorAll(
      ".article-body .footnote-marker"
    );

  function closeAll() {
    markers.forEach(
      (marker) => {
        const id =
          marker.getAttribute(
            "aria-controls"
          );

        if (!id) {
          return;
        }

        const popover =
          document.getElementById(
            id
          );

        if (!popover) {
          return;
        }

        popover.hidden =
          true;

        marker.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    );
  }

  markers.forEach(
    (marker) => {
      marker.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          const id =
            marker.getAttribute(
              "aria-controls"
            );

          const popover =
            document.getElementById(
              id
            );

          if (!popover) {
            return;
          }

          const open =
            marker.getAttribute(
              "aria-expanded"
            ) === "true";

          closeAll();

          if (!open) {
            popover.hidden =
              false;

            marker.setAttribute(
              "aria-expanded",
              "true"
            );
          }
        }
      );
    }
  );

  document.addEventListener(
    "click",
    closeAll
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
        "Escape"
      ) {
        closeAll();
      }
    }
  );
}

/* =========================================================
   기사 로드
========================================================= */

async function loadArticle() {
  if (!articleDetail) {
    return;
  }

  const articleId =
    getArticleId();

  if (!articleId) {
    articleDetail.innerHTML = `
      <p class="article-error">
        기사 주소가 올바르지 않습니다.
      </p>
    `;

    return;
  }

  try {
    const response =
      await fetch(
        `${POSTS_URL}?v=${Date.now()}`,
        {
          cache:
            "no-store"
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
      Array.isArray(
        data.posts
      )
        ? data.posts
        : [];

    const post =
      posts.find(
        (item) =>
          item.id ===
            articleId &&
          item.published !==
            false
      );

    if (!post) {
      articleDetail.innerHTML = `
        <p class="article-error">
          존재하지 않거나 공개되지 않은 기사입니다.
        </p>
      `;

      return;
    }

    renderArticle(
      post
    );
  } catch (error) {
    console.error(error);

    articleDetail.innerHTML = `
      <p class="article-error">
        기사를 불러오지 못했습니다.
      </p>
    `;
  }
}

loadArticle();