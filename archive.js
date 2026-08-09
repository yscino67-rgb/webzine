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
  하나의 버튼을 누를 때
  아래 순서대로 계속 순환합니다.

  LATEST
  ↓
  OLDEST
  ↓
  CRITICISM
  ↓
  INTERVIEW
  ↓
  ESSAY
  ↓
  ARTICLE
  ↓
  LATEST
*/

const SORT_MODES = [
  {
    id: "newest",
    label: "LATEST"
  },

  {
    id: "oldest",
    label: "OLDEST"
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
   상태
========================================================= */

let allPosts = [];

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
    parseDate(
      dateValue
    );

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
   URL 카테고리 읽기
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


/* =========================================================
   처음 들어왔을 때 정렬 상태 결정
========================================================= */

function setInitialModeFromUrl() {
  const selectedCategory =
    getCategoryFromUrl();

  /*
    ALL이면 항상 LATEST부터
  */
  if (
    selectedCategory === "all"
  ) {
    currentModeIndex = 0;

    return;
  }

  /*
    상단 메뉴에서
    특정 카테고리를 눌러 들어왔다면
    해당 카테고리 상태로 시작
  */

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
   URL 갱신
========================================================= */

function updateUrlForMode(modeId) {
  const url =
    new URL(
      window.location.href
    );

  /*
    LATEST / OLDEST는
    전체 기사
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
    /*
      카테고리 상태라면
      URL에도 해당 카테고리 표시
    */

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
   기사 한 개 생성
========================================================= */

function createPostItem(post) {
  const link =
    document.createElement(
      "a"
    );

  link.className =
    "index-item";

  link.href =
    `./article.html?id=${encodeURIComponent(
      post.id
    )}`;


  /* -------------------------
     작성자
  ------------------------- */

  const author =
    document.createElement(
      "span"
    );

  author.className =
    "index-author";

  author.textContent =
    post.author || "";


  /* -------------------------
     제목
  ------------------------- */

  const title =
    document.createElement(
      "h2"
    );

  title.className =
    "index-title";

  title.textContent =
    post.title || "";


  /* -------------------------
     날짜
  ------------------------- */

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


  /* -------------------------
     세부 카테고리
  ------------------------- */

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


  /* -------------------------
     카드 결합

     CSS grid-area에서
     화면 위치를 결정하므로
     DOM 순서는 유지
  ------------------------- */

  link.append(
    author,
    title,
    date,
    category
  );

  return link;
}


/* =========================================================
   빈 카드 생성
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
    <span class="index-author"></span>
    <h2 class="index-title"></h2>
    <time class="index-date"></time>
    <span class="index-subcategory"></span>
  `;

  return item;
}


/* =========================================================
   현재 상태에 맞게 기사 가공
========================================================= */
function getVisiblePosts() {
  const currentMode =
    SORT_MODES[
      currentModeIndex
    ];

  /*
    비공개 기사 제외
  */
  let visiblePosts =
    allPosts.filter(
      (post) =>
        post.published !== false
    );

  /*
    카테고리 모드인지 확인
  */
  const isCategoryMode =
    ![
      "newest",
      "oldest"
    ].includes(
      currentMode.id
    );

  /*
    카테고리 상태라면
    해당 카테고리만 남김
  */
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
    OLDEST
  */
  if (
    currentMode.id ===
    "oldest"
  ) {
    visiblePosts.sort(
      (
        firstPost,
        secondPost
      ) => {
        const dateDifference =
          parseDate(
            firstPost.date
          ) -
          parseDate(
            secondPost.date
          );

        /*
          날짜가 다르면
          오래된 날짜부터
        */
        if (
          dateDifference !== 0
        ) {
          return dateDifference;
        }

        /*
          같은 날짜면
          먼저 등록된 글부터
        */
        return (
          allPosts.indexOf(
            firstPost
          ) -
          allPosts.indexOf(
            secondPost
          )
        );
      }
    );
  } else {
    /*
      LATEST 및 카테고리 상태는
      모두 최신순
    */
    visiblePosts.sort(
      (
        firstPost,
        secondPost
      ) => {
        const dateDifference =
          parseDate(
            secondPost.date
          ) -
          parseDate(
            firstPost.date
          );

        /*
          날짜가 다르면
          최신 날짜부터
        */
        if (
          dateDifference !== 0
        ) {
          return dateDifference;
        }

        /*
          같은 날짜면
          나중에 등록된 글부터
        */
        return (
          allPosts.indexOf(
            secondPost
          ) -
          allPosts.indexOf(
            firstPost
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


  /*
    실제 화면 글자
  */

  sortButton.textContent =
    currentMode.label;


  /*
    접근성 안내
  */

  sortButton.setAttribute(
    "aria-label",
    `현재 정렬: ${currentMode.label}. 누르면 ${nextMode.label}으로 변경됩니다.`
  );


  /*
    현재 상태를 HTML dataset에도 기록
  */

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


  /* =====================================================
     결과 없음
  ===================================================== */

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


  /* =====================================================
     기사 컬럼
  ===================================================== */

  const column =
    document.createElement(
      "div"
    );

  column.className =
    "index-column";


  /* =====================================================
     기사 출력
  ===================================================== */

  visiblePosts.forEach(
    (post) => {
      column.appendChild(
        createPostItem(
          post
        )
      );
    }
  );


  /* =====================================================
     PC의 기존 빈 행 유지
  ===================================================== */

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
      /*
        다음 상태로 이동
      */

      currentModeIndex =
        (
          currentModeIndex + 1
        ) %
        SORT_MODES.length;


      const currentMode =
        SORT_MODES[
          currentModeIndex
        ];


      /*
        URL 갱신
      */

      updateUrlForMode(
        currentMode.id
      );


      /*
        다시 렌더링
      */

      renderPosts();
    }
  );
}


/* =========================================================
   브라우저 뒤로가기 / 앞으로가기
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


    /*
      URL 기준 최초 상태 설정
    */

    setInitialModeFromUrl();


    /*
      화면 출력
    */

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