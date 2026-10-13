"use strict";

/* =========================================================
   DOM
========================================================= */

const backButton =
  document.getElementById(
    "back-button"
  );

const saveButton =
  document.getElementById(
    "save-position-button"
  );

const message =
  document.getElementById(
    "position-message"
  );

const status =
  document.getElementById(
    "position-status"
  );

const workspace =
  document.getElementById(
    "position-workspace"
  );

const titleElement =
  document.getElementById(
    "position-title"
  );

const previewTitle =
  document.getElementById(
    "preview-title"
  );

const previewBody =
  document.getElementById(
    "preview-body"
  );

const imageList =
  document.getElementById(
    "position-image-list"
  );

const imageTemplate =
  document.getElementById(
    "image-card-template"
  );


/* =========================================================
   상태
========================================================= */

let currentPost = null;

let currentPosts = [];

let imagePositions = [];

let imageCards = [];


/* =========================================================
   게시글 ID
========================================================= */

function getPostId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("id");
}


/* =========================================================
   JSON 응답
========================================================= */

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
    return {};
  }
}


/* =========================================================
   이미지 목록
========================================================= */

function getPostImages(post) {
  const images = [];

  const thumbnail =
    String(
      post.thumbnail || ""
    ).trim();

  if (thumbnail) {
    images.push(
      thumbnail
    );
  }

  if (
    Array.isArray(
      post.images
    )
  ) {
    post.images
      .map((item) => {
        if (
          typeof item ===
          "string"
        ) {
          return item.trim();
        }

        if (
          item &&
          typeof item ===
          "object"
        ) {
          return String(
            item.image || ""
          ).trim();
        }

        return "";
      })
      .filter(Boolean)
      .slice(0, 4)
      .forEach((src) => {
        images.push(src);
      });
  }

  return images;
}


/* =========================================================
   본문의 기준 블록
========================================================= */

function getBodyBlocks() {
  return Array.from(
    previewBody.children
  ).filter((element) => {
    return (
      element.matches(
        "p, h1, h2, h3, h4, blockquote, ul, ol, div"
      )
    );
  });
}


/* =========================================================
   기본 이미지 위치

   저장된 위치가 아직 없을 경우
   전체 글에 이미지를 적당히 분산
========================================================= */

function createDefaultPositions(
  imageCount,
  blockCount
) {
  if (
    imageCount === 0
  ) {
    return [];
  }

  return Array.from(
    {
      length:
        imageCount
    },
    (_, index) => {
      if (
        blockCount === 0
      ) {
        return {
          imageIndex:
            index,

          afterBlock:
            0
        };
      }

      const ratio =
        imageCount === 1
          ? 0
          : index /
            (
              imageCount -
              1
            );

      return {
        imageIndex:
          index,

        afterBlock:
          Math.round(
            ratio *
            Math.max(
              blockCount - 1,
              0
            )
          )
      };
    }
  );
}


/* =========================================================
   저장된 위치 읽기
========================================================= */

function getInitialPositions(
  post,
  imageCount,
  blockCount
) {
  if (
    Array.isArray(
      post.imagePositions
    ) &&
    post.imagePositions.length
  ) {
    return Array.from(
      {
        length:
          imageCount
      },
      (_, index) => {
        const saved =
          post.imagePositions.find(
            (item) =>
              Number(
                item.imageIndex
              ) === index
          );

        return {
          imageIndex:
            index,

          afterBlock:
            saved
              ? Math.max(
                  0,
                  Math.min(
                    blockCount,
                    Number(
                      saved.afterBlock
                    ) || 0
                  )
                )
              : 0
        };
      }
    );
  }

  return createDefaultPositions(
    imageCount,
    blockCount
  );
}


/* =========================================================
   기준 문단 표시
========================================================= */

function updateAnchorHighlights() {
  const blocks =
    getBodyBlocks();

  blocks.forEach(
    (block) => {
      block.classList.remove(
        "position-anchor-target"
      );
    }
  );

  imagePositions.forEach(
    (position) => {
      const index =
        Number(
          position.afterBlock
        );

      if (
        blocks[index]
      ) {
        blocks[index]
          .classList.add(
            "position-anchor-target"
          );
      }
    }
  );
}


/* =========================================================
   위치 이름
========================================================= */

function getAnchorLabel(
  afterBlock
) {
  const blocks =
    getBodyBlocks();

  if (
    blocks.length === 0 ||
    afterBlock <= 0
  ) {
    return "본문 시작";
  }

  if (
    afterBlock >=
    blocks.length - 1
  ) {
    return `본문 ${blocks.length}번째 블록`;
  }

  return `본문 ${
    afterBlock + 1
  }번째 블록`;
}


/* =========================================================
   실제 화면 위치 계산
========================================================= */

function getAnchorTop(
  afterBlock
) {
  const blocks =
    getBodyBlocks();

  if (
    blocks.length === 0
  ) {
    return 0;
  }

  const safeIndex =
    Math.max(
      0,
      Math.min(
        afterBlock,
        blocks.length - 1
      )
    );

  const block =
    blocks[safeIndex];

  return block.offsetTop;
}


/* =========================================================
   이미지 카드 위치 반영
========================================================= */

function layoutImageCards() {
  if (
    window.innerWidth <=
    900
  ) {
    imageList.style
      .minHeight = "";

    return;
  }

  const blocks =
    getBodyBlocks();

  let previousBottom = 0;

  imageCards.forEach(
    (card, index) => {
      const position =
        imagePositions[index];

      if (!position) {
        return;
      }

      const desiredTop =
        getAnchorTop(
          position.afterBlock
        );

      /*
        이미지끼리 겹치는 경우
        앞 이미지 밑으로 밀어냅니다.
      */

      const top =
        Math.max(
          desiredTop,
          previousBottom
        );

      card.style.top =
        `${top}px`;

      const cardHeight =
        card.offsetHeight;

      previousBottom =
        top +
        cardHeight +
        28;

      const label =
        card.querySelector(
          ".position-anchor-label"
        );

      if (label) {
        label.textContent =
          getAnchorLabel(
            position.afterBlock
          );
      }
    }
  );

  const bodyHeight =
    previewBody.offsetHeight;

  imageList.style.minHeight =
    `${Math.max(
      bodyHeight,
      previousBottom
    )}px`;

  updateAnchorHighlights();
}


/* =========================================================
   이미지 이동
========================================================= */

function moveImage(
  imageIndex,
  direction
) {
  const blocks =
    getBodyBlocks();

  const position =
    imagePositions[
      imageIndex
    ];

  if (!position) {
    return;
  }

  const max =
    Math.max(
      blocks.length - 1,
      0
    );

  const next =
    position.afterBlock +
    direction;

  position.afterBlock =
    Math.max(
      0,
      Math.min(
        max,
        next
      )
    );

  renderButtonStates();

  layoutImageCards();

  message.textContent =
    "위치가 변경되었습니다. 저장 버튼을 눌러 주세요.";
}


/* =========================================================
   버튼 활성화
========================================================= */

function renderButtonStates() {
  const blocks =
    getBodyBlocks();

  const max =
    Math.max(
      blocks.length - 1,
      0
    );

  imageCards.forEach(
    (card, index) => {
      const position =
        imagePositions[index];

      if (!position) {
        return;
      }

      const upButton =
        card.querySelector(
          ".image-move-up"
        );

      const downButton =
        card.querySelector(
          ".image-move-down"
        );

      upButton.disabled =
        position.afterBlock <= 0;

      downButton.disabled =
        position.afterBlock >=
        max;
    }
  );
}


/* =========================================================
   이미지 카드 생성
========================================================= */

function renderImages(
  post
) {
  const images =
    getPostImages(
      post
    );

  imageList.innerHTML = "";

  imageCards = [];

  if (
    images.length === 0
  ) {
    imageList.innerHTML = `
      <p>
        등록된 이미지가 없습니다.
      </p>
    `;

    return;
  }

  const blocks =
    getBodyBlocks();

  imagePositions =
    getInitialPositions(
      post,
      images.length,
      blocks.length
    );

  images.forEach(
    (src, index) => {
      const fragment =
        imageTemplate
          .content
          .cloneNode(true);

      const card =
        fragment.querySelector(
          ".position-image-card"
        );

      const number =
        fragment.querySelector(
          ".position-image-number"
        );

      const image =
        fragment.querySelector(
          ".position-image-preview"
        );

      const upButton =
        fragment.querySelector(
          ".image-move-up"
        );

      const downButton =
        fragment.querySelector(
          ".image-move-down"
        );

      number.textContent =
        index === 0
          ? "대표 이미지"
          : `추가 이미지 ${index}`;

      image.src =
        src;

      image.alt =
        post.title
          ? `${post.title} 이미지 ${
              index + 1
            }`
          : `이미지 ${
              index + 1
            }`;

      upButton.addEventListener(
        "click",
        () => {
          moveImage(
            index,
            -1
          );
        }
      );

      downButton.addEventListener(
        "click",
        () => {
          moveImage(
            index,
            1
          );
        }
      );

      image.addEventListener(
        "load",
        () => {
          layoutImageCards();
        }
      );

      imageList.appendChild(
        fragment
      );

      imageCards.push(
        imageList.lastElementChild
      );
    }
  );

  renderButtonStates();

  requestAnimationFrame(
    layoutImageCards
  );
}


/* =========================================================
   기사 렌더링
========================================================= */

function renderPost(
  post
) {
  titleElement.textContent =
    `이미지 위치 설정 · ${
      post.title || ""
    }`;

  previewTitle.textContent =
    post.title || "";

  previewBody.innerHTML =
    Array.isArray(
      post.body
    )
      ? post.body.join("")
      : String(
          post.body || ""
        );

  status.hidden = true;

  workspace.hidden = false;

  renderImages(post);
}


/* =========================================================
   게시글 불러오기
========================================================= */

async function loadPost() {
  const postId =
    getPostId();

  if (!postId) {
    status.textContent =
      "게시글 ID가 없습니다.";

    saveButton.disabled =
      true;

    return;
  }

  try {
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

    if (
      response.status ===
      401
    ) {
      window.location.href =
        "./index.html";

      return;
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        "게시글을 불러오지 못했습니다."
      );
    }

    currentPosts =
      Array.isArray(
        data.posts
      )
        ? data.posts
        : [];

    currentPost =
      currentPosts.find(
        (post) =>
          post.id ===
          postId
      );

    if (!currentPost) {
      status.textContent =
        "게시글을 찾을 수 없습니다.";

      saveButton.disabled =
        true;

      return;
    }

    renderPost(
      currentPost
    );

  } catch (error) {
    console.error(error);

    status.textContent =
      error.message ||
      "게시글을 불러오지 못했습니다.";
  }
}


/* =========================================================
   위치 저장

   기존 게시글 전체를 다시 보내면서
   imagePositions만 추가합니다.
========================================================= */

async function savePositions() {
  if (!currentPost) {
    return;
  }

  message.textContent =
    "저장 중입니다.";

  saveButton.disabled =
    true;

  try {
    const nextPost = {
      ...currentPost,

      imagePositions:
        imagePositions.map(
          (item) => ({
            imageIndex:
              Number(
                item.imageIndex
              ),

            afterBlock:
              Number(
                item.afterBlock
              )
          })
        )
    };

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

              post:
                nextPost
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
        "위치를 저장하지 못했습니다."
      );
    }

    currentPost =
      Array.isArray(
        data.posts
      )
        ? data.posts.find(
            (post) =>
              post.id ===
              currentPost.id
          ) ||
          nextPost
        : nextPost;

    message.textContent =
      "이미지 위치를 저장했습니다.";

  } catch (error) {
    console.error(error);

    message.textContent =
      error.message ||
      "저장 중 오류가 발생했습니다.";

  } finally {
    saveButton.disabled =
      false;
  }
}


/* =========================================================
   이벤트
========================================================= */

backButton.addEventListener(
  "click",
  () => {
    window.location.href =
      "./index.html";
  }
);

saveButton.addEventListener(
  "click",
  savePositions
);

window.addEventListener(
  "resize",
  () => {
    layoutImageCards();
  }
);


/* =========================================================
   실행
========================================================= */

loadPost();