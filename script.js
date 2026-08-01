"use strict";

"use strict";

/* 내부 페이지에서 새로고침하면 인트로로 이동 */
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
  });
}

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
    marker.setAttribute("aria-expanded", "false");
  });
}

footnoteMarkers.forEach((marker) => {
  marker.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const footnoteId =
      marker.getAttribute("aria-controls");

    if (!footnoteId) return;

    const footnote =
      document.getElementById(footnoteId);

    if (!footnote) return;

    const isOpen =
      marker.getAttribute("aria-expanded") === "true";

    closeAllFootnotes();

    if (!isOpen) {
      footnote.hidden = false;
      marker.setAttribute("aria-expanded", "true");
    }
  });
});

document.addEventListener("click", closeAllFootnotes);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllFootnotes();
  }
});