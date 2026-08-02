"use strict";

/* =========================================================
   내부 페이지 새로고침 시 인트로로 이동
========================================================= */

const navigationEntry =
  performance.getEntriesByType("navigation")[0];

const isReload =
  navigationEntry?.type === "reload";

const currentPath =
  window.location.pathname.replace(/\/+$/, "");

const isIntroPage =
  currentPath === "" ||
  currentPath === "/index.html";

const isAdminPage =
  currentPath.startsWith("/admin");

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
  document.querySelector(".menu-button");

const siteMenu =
  document.querySelector(".site-menu");

if (menuButton && siteMenu) {
  menuButton.addEventListener("click", () => {
    const isOpen =
      siteMenu.classList.toggle("is-open");

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
  });
}

/* =========================================================
   아카이브 카테고리 메뉴 열기 / 닫기
========================================================= */

const archiveFilter =
  document.querySelector(".archive-filter");

const archiveFilterToggle =
  document.querySelector(".archive-filter-toggle");

if (
  archiveFilter &&
  archiveFilterToggle
) {
  archiveFilterToggle.addEventListener(
    "click",
    () => {
      const isOpen =
        archiveFilter.classList.toggle("is-open");

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
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;

      archiveFilter.classList.remove("is-open");

      archiveFilterToggle.setAttribute(
        "aria-expanded",
        "false"
      );

      archiveFilterToggle.setAttribute(
        "aria-label",
        "카테고리 메뉴 열기"
      );
    }
  );
}

/* =========================================================
   각주 열기 / 닫기
========================================================= */

const footnoteMarkers =
  document.querySelectorAll(".footnote-marker");

function closeAllFootnotes() {
  footnoteMarkers.forEach((marker) => {
    const footnoteId =
      marker.getAttribute("aria-controls");

    if (!footnoteId) return;

    const footnote =
      document.getElementById(footnoteId);

    if (!footnote) return;

    footnote.hidden = true;

    marker.setAttribute(
      "aria-expanded",
      "false"
    );
  });
}

footnoteMarkers.forEach((marker) => {
  marker.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      const footnoteId =
        marker.getAttribute("aria-controls");

      if (!footnoteId) return;

      const footnote =
        document.getElementById(footnoteId);

      if (!footnote) return;

      const isOpen =
        marker.getAttribute("aria-expanded") ===
        "true";

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