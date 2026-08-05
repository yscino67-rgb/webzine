"use strict";

/* =========================================================
   내부 페이지 새로고침 시 인트로로 이동
========================================================= */

const navigationEntry =
  performance.getEntriesByType(
    "navigation"
  )[0];

const isReload =
  navigationEntry?.type ===
  "reload";

const currentPath =
  window.location.pathname
    .replace(/\/+$/, "");

const isIntroPage =
  currentPath === "" ||
  currentPath === "/index.html";

const isAdminPage =
  currentPath.startsWith(
    "/admin"
  );

if (
  isReload &&
  !isIntroPage &&
  !isAdminPage
) {
  window.location.replace("/");
}

/* =========================================================
   메인 슬라이드 메뉴
========================================================= */

const menuButton =
  document.querySelector(
    ".menu-button"
  );

const siteMenu =
  document.querySelector(
    ".site-menu"
  );

if (
  menuButton &&
  siteMenu
) {
  menuButton.addEventListener(
    "click",
    () => {
      const isOpen =
        siteMenu.classList.toggle(
          "is-open"
        );

      menuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

      menuButton.setAttribute(
        "aria-label",
        isOpen
          ? "메뉴 닫기"
          : "메뉴 열기"
      );
    }
  );
}

/* =========================================================
   아카이브 및 기사 상단 메뉴
========================================================= */

const archiveFilter =
  document.querySelector(
    ".archive-filter"
  );

const archiveFilterToggle =
  document.querySelector(
    ".archive-filter-toggle"
  );

const archiveFilterItems =
  document.querySelector(
    ".archive-filter-items"
  );

if (
  archiveFilter &&
  archiveFilterToggle &&
  archiveFilterItems
) {
  /*
    HTML에 is-open이 있다면 처음부터 펼쳐진 상태입니다.
  */
  const defaultOpen =
    archiveFilter.dataset
      .defaultOpen === "true" ||
    archiveFilter.classList
      .contains("is-open");

  function setArchiveMenuState(
    isOpen
  ) {
    archiveFilter.classList.toggle(
      "is-open",
      isOpen
    );

    archiveFilterToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    archiveFilterToggle.setAttribute(
      "aria-label",
      isOpen
        ? "카테고리 메뉴 닫기"
        : "카테고리 메뉴 열기"
    );
  }

  function updateArchiveMenuWidth() {
    /*
      펼쳐진 상태를 보존한 채
      메뉴의 실제 콘텐츠 너비를 측정합니다.
    */
    const wasOpen =
      archiveFilter.classList
        .contains("is-open");

    const previousWidth =
      archiveFilterItems.style
        .width;

    const previousMaxWidth =
      archiveFilterItems.style
        .maxWidth;

    const previousTransition =
      archiveFilterItems.style
        .transition;

    const previousOverflow =
      archiveFilterItems.style
        .overflow;

    archiveFilterItems.style
      .transition = "none";

    archiveFilterItems.style
      .width = "max-content";

    archiveFilterItems.style
      .maxWidth = "none";

    archiveFilterItems.style
      .overflow = "visible";

    const menuWidth =
      Math.ceil(
        archiveFilterItems
          .scrollWidth
      );

    archiveFilter.style.setProperty(
      "--archive-menu-width",
      `${menuWidth}px`
    );

    archiveFilterItems.style
      .width = previousWidth;

    archiveFilterItems.style
      .maxWidth =
        previousMaxWidth;

    archiveFilterItems.style
      .overflow =
        previousOverflow;

    archiveFilterItems.style
      .transition =
        previousTransition;

    setArchiveMenuState(
      wasOpen
    );
  }

  function initializeArchiveMenu() {
    updateArchiveMenuWidth();

    setArchiveMenuState(
      defaultOpen
    );
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(
      initializeArchiveMenu
    );
  } else {
    initializeArchiveMenu();
  }

  archiveFilterToggle.addEventListener(
    "click",
    () => {
      updateArchiveMenuWidth();

      requestAnimationFrame(
        () => {
          const nextOpen =
            !archiveFilter.classList
              .contains("is-open");

          setArchiveMenuState(
            nextOpen
          );
        }
      );
    }
  );

  let archiveResizeTimer = null;

  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(
        archiveResizeTimer
      );

      archiveResizeTimer =
        window.setTimeout(
          updateArchiveMenuWidth,
          120
        );
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      setArchiveMenuState(
        false
      );
    }
  );
}

/* =========================================================
   각주 열기 / 닫기

   article.js가 본문을 나중에 삽입하므로
   document 이벤트 위임 방식을 사용합니다.
========================================================= */

function getFootnoteMarkers() {
  return Array.from(
    document.querySelectorAll(
      ".footnote-marker"
    )
  );
}

function closeAllFootnotes(
  exceptMarker = null
) {
  getFootnoteMarkers().forEach(
    (marker) => {
      if (
        marker ===
        exceptMarker
      ) {
        return;
      }

      const footnoteId =
        marker.getAttribute(
          "aria-controls"
        );

      if (!footnoteId) {
        return;
      }

      const footnote =
        document.getElementById(
          footnoteId
        );

      if (!footnote) {
        return;
      }

      footnote.hidden = true;

      marker.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  );
}

document.addEventListener(
  "click",
  (event) => {
    const marker =
      event.target.closest(
        ".footnote-marker"
      );

    /*
      각주 버튼 이외의 영역을 누르면 모두 닫습니다.
    */
    if (!marker) {
      closeAllFootnotes();

      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const footnoteId =
      marker.getAttribute(
        "aria-controls"
      );

    if (!footnoteId) {
      return;
    }

    const footnote =
      document.getElementById(
        footnoteId
      );

    if (!footnote) {
      return;
    }

    const isOpen =
      marker.getAttribute(
        "aria-expanded"
      ) === "true";

    closeAllFootnotes(
      marker
    );

    if (isOpen) {
      footnote.hidden = true;

      marker.setAttribute(
        "aria-expanded",
        "false"
      );

      return;
    }

    footnote.hidden = false;

    marker.setAttribute(
      "aria-expanded",
      "true"
    );
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key ===
      "Escape"
    ) {
      closeAllFootnotes();
    }
  }
);

/* =========================================================
   뒤로가기 복원 시 메뉴 너비 재계산
========================================================= */

window.addEventListener(
  "pageshow",
  (event) => {
    if (
      event.persisted &&
      archiveFilter &&
      archiveFilterItems
    ) {
      requestAnimationFrame(
        () => {
          const menuWidth =
            Math.ceil(
              archiveFilterItems
                .scrollWidth
            );

          archiveFilter.style
            .setProperty(
              "--archive-menu-width",
              `${menuWidth}px`
            );
        }
      );
    }
  }
);