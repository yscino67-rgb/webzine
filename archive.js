"use strict";

/* =========================================================
   HTML 요소
========================================================= */

const articleIndex =
  document.getElementById(
    "article-index"
  );

const sortButton =
  document.getElementById(
    "archive-sort-button"
  );

/* =========================================================
   기본 설정
========================================================= */

const POSTS_URL =
  "../content/posts.json";

const PLACEHOLDER_COUNT = 14;

/*
  버튼을 누를 때 아래 순서로 순환합니다.
*/
const SORT_MODES = [
  {
    id: "newest",
    label: "최신순"
  },
  {
    id: "oldest",
    label: "오래된순"
  },
  {
    id: "criticism",
    label: "CRITICISM"
  },
  {
    id: "interview",
    label: "INTERVIEW"
  },
  {
    id: "essay",
    label: "ESSAY"
  },
  {
    id: "article",
    label: "ARTICLE"
  }
];

/* =========================================================
   상태값
========================================================= */

let allPosts = [];

/*
  기본값은 최신순입니다.

  단, 상단 메뉴에서 특정 카테고리를 눌러
  category=criticism 등의 주소로 들어온 경우에는
  해당 카테고리 상태로 시작합니다.
*/
let currentModeIndex = 0;

/* =========================================================
   날짜 처리
========================================================= */

function parseDate(dateValue) {
  const date =
    new Date(
      `${dateValue}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return new Date(0);
  }

  return date;
}

function formatDate(dateValue) {
  const date =
    parseDate(dateValue);

  if (
    date.getTime() === 0
  ) {
    return dateValue;
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return (
    `${year}.${month}.${day}`
  );
}

/* =========================================================
   주소에서 카테고리 확인
========================================================= */

function getCategoryFromUrl() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("category") ||
    "all"
  ).toLowerCase();
}

/*
  URL에 특정 카테고리가 있으면
  해당 정렬 모드로 시작합니다.
*/
function setInitialModeFromUrl() {
  const selectedCategory =
    getCategoryFromUrl();

  if (
    selectedCategory === "all"
  ) {
    currentModeIndex = 0;

    return;
  }

  const categoryModeIndex =
    SORT_MODES.findIndex(
      (mode) =>
        mode.id ===
        selectedCategory
    );

  currentModeIndex =
    categoryModeIndex >= 0
      ? categoryModeIndex
      : 0;
}

/* =========================================================
   주소 표시 갱신
========================================================= */

function updateUrlForMode(modeId) {
  const url =
    new URL(
      window.location.href
    );

  /*
    최신순과 오래된순은 전체 기사를 보여줍니다.
  */
  if (
    modeId === "newest" ||
    modeId === "oldest"
  ) {
    url.searchParams.set(
      "category",
      "all"
    );
  } else {
    url.searchParams.set(
      "category",
      modeId
    );
  }

  window.history.replaceState(
    {},
    "",
    url
  );
}

/* =========================================================
   실제 기사 항목 생성
========================================================= */

function createPostItem(post) {
  const link =
    document.createElement(
      "a"
    );

  link.className =
    "index-item";

  link.href =
    `./article.html?id=${encodeURIComponent(post.id)}`;

  const author =
    document.createElement(
      "span"
    );

  author.className =
    "index-author";

  author.textContent =
    post.author || "";

  const title =
    document.createElement(
      "h2"
    );

  title.className =
    "index-title";

  title.textContent =
    post.title || "";

  const date =
    document.createElement(
      "time"
    );

  date.className =
    "index-date";

  date.dateTime =
    post.date || "";

  date.textContent =
    formatDate(
      post.date || ""
    );

  const category =
    document.createElement(
      "span"
    );

  category.className =
    "index-subcategory";

  category.textContent =
    post.subcategory ||
    String(
      post.category || ""
    ).toUpperCase();

  link.append(
    author,
    title,
    date,
    category
  );

  return link;
}

/* =========================================================
   빈칸 항목 생성
========================================================= */

function createPlaceholderItem() {
  const item =
    document.createElement(
      "div"
    );

  item.className =
    "index-item index-item--placeholder";

  item.setAttribute(
    "aria-hidden",
    "true"
  );

  item.innerHTML = `
    <span class="index-author">.</span>
    <h2 class="index-title">.</h2>
    <time class="index-date">.</time>
    <span class="index-subcategory">.</span>
  `;

  return item;
}

/* =========================================================
   현재 정렬 방식에 따라 기사 가공
========================================================= */

function getVisiblePosts() {
  const currentMode =
    SORT_MODES[
      currentModeIndex
    ];

  /*
    비공개 글은 항상 제외합니다.
  */
  let visiblePosts =
    allPosts.filter(
      (post) =>
        post.published !== false
    );

  /*
    카테고리 모드일 때 해당 카테고리만 표시합니다.
  */
  const isCategoryMode =
    ![
      "newest",
      "oldest"
    ].includes(
      currentMode.id
    );

  if (isCategoryMode) {
    visiblePosts =
      visiblePosts.filter(
        (post) => {
          return (
            String(
              post.category || ""
            ).toLowerCase() ===
            currentMode.id
          );
        }
      );
  }

  /*
    오래된순을 제외한 모든 상태는 최신순입니다.
  */
  if (
    currentMode.id ===
    "oldest"
  ) {
    visiblePosts.sort(
      (firstPost, secondPost) => {
        return (
          parseDate(
            firstPost.date
          ) -
          parseDate(
            secondPost.date
          )
        );
      }
    );
  } else {
    visiblePosts.sort(
      (firstPost, secondPost) => {
        return (
          parseDate(
            secondPost.date
          ) -
          parseDate(
            firstPost.date
          )
        );
      }
    );
  }

  return visiblePosts;
}

/* =========================================================
   정렬 버튼 표시 갱신
========================================================= */

function updateSortButton() {
  if (!sortButton) {
    return;
  }

  const currentMode =
    SORT_MODES[
      currentModeIndex
    ];

  const nextMode =
    SORT_MODES[
      (
        currentModeIndex + 1
      ) %
      SORT_MODES.length
    ];

  sortButton.textContent =
    currentMode.label;

  sortButton.setAttribute(
    "aria-label",
    `현재 정렬: ${currentMode.label}. 누르면 ${nextMode.label}으로 변경됩니다.`
  );

  sortButton.dataset.mode =
    currentMode.id;
}

/* =========================================================
   기사 목록 출력
========================================================= */

function renderPosts() {
  if (!articleIndex) {
    return;
  }

  const visiblePosts =
    getVisiblePosts();

  articleIndex.innerHTML = "";

  /*
    해당 조건에 기사가 하나도 없는 경우
  */
  if (
    visiblePosts.length === 0
  ) {
    const emptyMessage =
      document.createElement(
        "p"
      );

    emptyMessage.className =
      "archive-empty";

    emptyMessage.textContent =
      "해당 조건의 기사가 없습니다.";

    articleIndex.appendChild(
      emptyMessage
    );

    updateSortButton();

    return;
  }

  const column =
    document.createElement(
      "div"
    );

  column.className =
    "index-column";

  visiblePosts.forEach(
    (post) => {
      column.appendChild(
        createPostItem(post)
      );
    }
  );

  /*
    기존 디자인의 빈 줄을 유지합니다.
  */
  const placeholderTotal =
    Math.max(
      PLACEHOLDER_COUNT -
        visiblePosts.length,
      0
    );

  for (
    let index = 0;
    index < placeholderTotal;
    index += 1
  ) {
    column.appendChild(
      createPlaceholderItem()
    );
  }

  articleIndex.appendChild(
    column
  );

  updateSortButton();
}

/* =========================================================
   정렬 버튼 클릭
========================================================= */

if (sortButton) {
  sortButton.addEventListener(
    "click",
    () => {
      currentModeIndex =
        (
          currentModeIndex + 1
        ) %
        SORT_MODES.length;

      const currentMode =
        SORT_MODES[
          currentModeIndex
        ];

      updateUrlForMode(
        currentMode.id
      );

      renderPosts();
    }
  );
}

/* =========================================================
   브라우저 뒤로가기·앞으로가기
========================================================= */

window.addEventListener(
  "popstate",
  () => {
    setInitialModeFromUrl();

    renderPosts();
  }
);

/* =========================================================
   게시글 불러오기
========================================================= */

async function loadPosts() {
  if (!articleIndex) {
    return;
  }

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

    allPosts =
      Array.isArray(
        data.posts
      )
        ? data.posts
        : [];

    setInitialModeFromUrl();

    renderPosts();
  } catch (error) {
    console.error(
      "아카이브 로드 실패:",
      error
    );

    articleIndex.innerHTML = `
      <p class="archive-error">
        기사를 불러오지 못했습니다.
      </p>
    `;
  }
}

/* =========================================================
   실행
========================================================= */

loadPosts();