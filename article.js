"use strict";


/* =========================================================
   기본 요소
========================================================= */

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

  return params.get(
    "id"
  );
}


/* =========================================================
   HTML 문자 이스케이프
========================================================= */

function escapeHtml(
  value
) {
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
  const thumbnail =
    String(
      post.thumbnail || ""
    ).trim();


  /*
    이미지가 없는 기사에서는
    우측 이미지 영역 자체를 만들지 않습니다.
  */

  if (!thumbnail) {
    return "";
  }


  const imageAlt =
    escapeHtml(
      post.imageAlt ||
      post.title ||
      ""
    );


  const imageCaption =
    escapeHtml(
      post.imageCaption ||
      ""
    );


  const imageSource =
    escapeHtml(
      post.imageSource ||
      ""
    );


  const sourceMarkup =
    imageSource
      ? `
        <br />
        <span class="article-image-source">
          출처: ${imageSource}
        </span>
      `
      : "";


  const captionMarkup =
    imageCaption ||
    imageSource
      ? `
        <figcaption class="article-caption">
          ${imageCaption}
          ${sourceMarkup}
        </figcaption>
      `
      : "";


  return `
    <figure class="article-visual">
      <img
        class="article-image"
        src="${escapeHtml(thumbnail)}"
        alt="${imageAlt}"
      />

      ${captionMarkup}
    </figure>
  `;
}


/* =========================================================
   작성자 소개
========================================================= */

function createAuthorMarkup(
  post
) {
  const author =
    String(
      post.author || ""
    ).trim();


  const authorBio =
    String(
      post.authorBio || ""
    ).trim();


  if (
    !author &&
    !authorBio
  ) {
    return "";
  }


  return `
    <section class="article-author-info">
      ${
        author
          ? `
            <p class="article-author-name">
              ${escapeHtml(author)}
            </p>
          `
          : ""
      }

      ${
        authorBio
          ? `
            <p class="article-author-bio">
              ${escapeHtml(authorBio)}
            </p>
          `
          : ""
      }
    </section>
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


  /* =======================================================
     본문 HTML

     CMS에서 저장한 HTML이므로
     escapeHtml을 적용하지 않습니다.
  ======================================================= */

  const bodyHtml =
    Array.isArray(
      post.body
    )
      ? post.body.join("")
      : String(
          post.body || ""
        );


  /* =======================================================
     이미지 유무
  ======================================================= */

  const hasImage =
    Boolean(
      String(
        post.thumbnail || ""
      ).trim()
    );


  /*
    중요

    이미지 없음:
    article-layout--text-only

    이미지 있음:
    article-layout--with-image

    article.css에서 이 클래스를 기준으로
    본문 폭과 레이아웃이 갈립니다.
  */

  const layoutClass =
    hasImage
      ? "article-layout article-layout--with-image"
      : "article-layout article-layout--text-only";


  /* =======================================================
     작성자
  ======================================================= */

  const authorMarkup =
    createAuthorMarkup(
      post
    );


  /* =======================================================
     전체 출력
  ======================================================= */

  articleDetail.innerHTML = `
    <!-- ===============================================
         기사 제목
    ================================================ -->

    <header class="article-header">
      <h1 class="article-title">
        ${escapeHtml(post.title || "")}
      </h1>
    </header>


    <!-- ===============================================
         기사 레이아웃
    ================================================ -->

    <div class="${layoutClass}">

      <!-- =============================================
           본문
      ============================================== -->

      <section class="article-copy">

        <div class="article-body">
          ${bodyHtml}
        </div>


        <!-- ===========================================
             작성자 / 작성자 소개
        ============================================ -->

        ${authorMarkup}


        <!-- ===========================================
             기사 하단
        ============================================ -->

        <footer class="article-footer">

          <!-- 날짜 -->

          <p class="article-footer-date">
            2026년 8월
          </p>


          <!-- 선 + INDEX -->

          <div class="article-footer-bottom">
            <a
              href="./archive.html?category=all"
              class="back-link"
            >
              INDEX
            </a>
          </div>
        </footer>
      </section>


      <!-- =============================================
           이미지
      ============================================== -->

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


  /* =======================================================
     모든 각주 닫기
  ======================================================= */

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


  /* =======================================================
     각주 클릭
  ======================================================= */

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


          const open =
            marker.getAttribute(
              "aria-expanded"
            ) ===
            "true";


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


  /* =======================================================
     바깥 클릭
  ======================================================= */

  document.addEventListener(
    "click",
    closeAll
  );


  /* =======================================================
     ESC
  ======================================================= */

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


  /* =======================================================
     ID 없음
  ======================================================= */

  if (!articleId) {
    articleDetail.innerHTML = `
      <p class="article-error">
        기사 주소가 올바르지 않습니다.
      </p>

      <a
        href="./archive.html?category=all"
        class="back-link"
      >
        INDEX
      </a>
    `;

    return;
  }


  /* =======================================================
     데이터 요청
  ======================================================= */

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


    /* =====================================================
       현재 기사 찾기
    ===================================================== */

    const post =
      posts.find(
        (item) => {
          return (
            item.id ===
              articleId &&
            item.published !==
              false
          );
        }
      );


    /* =====================================================
       기사 없음
    ===================================================== */

    if (!post) {
      articleDetail.innerHTML = `
        <p class="article-error">
          존재하지 않거나 공개되지 않은 기사입니다.
        </p>

        <a
          href="./archive.html?category=all"
          class="back-link"
        >
          INDEX
        </a>
      `;

      return;
    }


    /* =====================================================
       출력
    ===================================================== */

    renderArticle(
      post
    );

  } catch (
    error
  ) {
    console.error(
      "기사 로드 오류:",
      error
    );


    articleDetail.innerHTML = `
      <p class="article-error">
        기사를 불러오지 못했습니다.
      </p>

      <a
        href="./archive.html?category=all"
        class="back-link"
      >
        INDEX
      </a>
    `;
  }
}


/* =========================================================
   실행
========================================================= */

loadArticle();