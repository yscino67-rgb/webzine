"use strict";

/* =========================================================
   Netlify Identity
========================================================= */

if (window.netlifyIdentity) {
  window.netlifyIdentity.on("init", (user) => {
    if (user) return;

    window.netlifyIdentity.on("login", () => {
      window.location.href = "/admin/editor/";
    });
  });
}

/* =========================================================
   CMS 미리보기 스타일
========================================================= */

if (window.CMS) {
  CMS.registerPreviewStyle(
    "/css/style.css"
  );

  CMS.registerPreviewStyle(
    "/css/article.css"
  );
}