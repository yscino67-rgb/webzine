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

function createImageMarkup(post) {
  const thumbnail =
    String(
      post.thumbnail || ""
    ).trim();

  const extraImages =
    Array.isArray(post.images)
      ? post.images
          .map((item) => {
            if (typeof item === "string") {
              return item.trim();
            }

            if (
              item &&
              typeof item === "object"
            ) {
              return String(
                item.image || ""
              ).trim();
            }

            return "";
          })
          .filter(Boolean)
          .slice(0, 5)
      : [];

  const images = [
    ...(thumbnail
      ? [thumbnail]
      : []),
    ...extraImages
  ];

  if (images.length === 0) {
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
      post.imageCaption || ""
    );

  const imageSource =
    escapeHtml(
      post.imageSource || ""
    );

  const captionMarkup =
    imageCaption || imageSource
      ? `
        <figcaption class="article-caption">
          ${
            imageCaption
              ? imageCaption
              : ""
          }

          ${
            imageSource
              ? `
                ${
                  imageCaption
                    ? "<br />"
                    : ""
                }

                <span class="article-image-source">
                  출처: ${imageSource}
                </span>
              `
              : ""
          }
        </figcaption>
      `
      : "";

  return `
    <div class="article-visuals">
      ${images
        .map(
          (src, index) => `
            <figure class="article-visual">
              <img
                class="article-image"
                src="${escapeHtml(src)}"
                alt="${imageAlt}${
                  images.length > 1
                    ? ` ${index + 1}`
                    : ""
                }"
              />

              ${
                index === 0
                  ? captionMarkup
                  : ""
              }
            </figure>
          `
        )
        .join("")}
    </div>
  `;
}

/* =========================================================
   작성자 + 한 줄 소개
========================================================= */

function createAuthorMarkup(post) {
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
    <aside class="article-author-info">
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
    </aside>
  `;
}


/* =========================================================
   기사 출력
========================================================= */

function renderArticle(post) {
  if (!articleDetail) {
    return;
  }


  document.title =
    post.title ||
    "Magazine Article";


  /*
    CMS에서 저장한 본문은 HTML이므로
    escapeHtml을 적용하지 않습니다.
  */

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
    이미지 없는 기사:
    가운데 760px 본문

    이미지 있는 기사:
    왼쪽 본문 + 오른쪽 이미지
  */

  const layoutClass =
    hasImage
      ? "article-layout article-layout--with-image"
      : "article-layout article-layout--text-only";


  articleDetail.innerHTML = `
    <!-- ===============================================
         제목
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
             작성자 / 한 줄 소개
        ============================================ -->

        ${createAuthorMarkup(post)}


        <!-- ===========================================
             기사 하단
        ============================================ -->

        <footer class="article-footer">


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

function initializeVideoEmbeds() {
  const articleBody =
    document.querySelector(
      ".article-body"
    );

  if (!articleBody) {
    return;
  }

  const links =
    articleBody.querySelectorAll(
      "a[href]"
    );

  links.forEach((link) => {
    const href =
      link.getAttribute("href");

    if (!href) {
      return;
    }

    let videoId = "";

    try {
      const url =
        new URL(
          href,
          window.location.origin
        );

      /*
        youtube.com/watch?v=...
      */
      if (
        url.hostname.includes(
          "youtube.com"
        )
      ) {
        if (
          url.pathname === "/watch"
        ) {
          videoId =
            url.searchParams.get("v") ||
            "";
        }

        /*
          youtube.com/shorts/...
          youtube.com/embed/...
        */
        if (
          url.pathname.startsWith(
            "/shorts/"
          ) ||
          url.pathname.startsWith(
            "/embed/"
          )
        ) {
          videoId =
            url.pathname
              .split("/")
              .filter(Boolean)[1] ||
            "";
        }
      }

      /*
        youtu.be/...
      */
      if (
        url.hostname.includes(
          "youtu.be"
        )
      ) {
        videoId =
          url.pathname
            .split("/")
            .filter(Boolean)[0] ||
          "";
      }
    } catch (error) {
      return;
    }

    if (!videoId) {
      return;
    }

    const parent =
      link.parentElement;

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "article-video";

    wrapper.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${encodeURIComponent(
          videoId
        )}"
        title="YouTube video"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    `;

    /*
      링크 하나만 있는 문단이면
      문단 전체를 영상으로 교체
    */

    if (
      parent &&
      parent.tagName === "P" &&
      parent.textContent.trim() ===
        link.textContent.trim()
    ) {
      parent.replaceWith(wrapper);
    } else {
      link.replaceWith(wrapper);
    }
  });
}

  initializeVideoEmbeds();
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


          const isOpen =
            marker.getAttribute(
              "aria-expanded"
            ) ===
            "true";


          closeAll();


          if (!isOpen) {
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
     기사 ID 없음
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
      Array.isArray(
        data.posts
      )
        ? data.posts
        : [];


    /* =====================================================
       현재 기사
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


    renderArticle(post);

  } catch (error) {
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