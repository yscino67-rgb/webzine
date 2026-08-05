"use strict";

const articleIndex =
  document.getElementById("article-index");

const POSTS_URL =
  "../content/posts.json";

const PLACEHOLDER_COUNT = 14;

function formatDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function createPostItem(post) {
  const link =
    document.createElement("a");

  link.className = "index-item";
  link.href =
    `./article.html?id=${encodeURIComponent(post.id)}`;

  const author =
    document.createElement("span");

  author.className = "index-author";
  author.textContent = post.author || "";

  const title =
    document.createElement("h2");

  title.className = "index-title";
  title.textContent = post.title || "";

  const date =
    document.createElement("time");

  date.className = "index-date";
  date.dateTime = post.date || "";
  date.textContent = formatDate(post.date || "");

  const category =
    document.createElement("span");

  category.className = "index-subcategory";
  category.textContent =
    post.subcategory ||
    post.category?.toUpperCase() ||
    "";

  link.append(
    author,
    title,
    date,
    category
  );

  return link;
}

function createPlaceholderItem() {
  const item =
    document.createElement("div");

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

function getSelectedCategory() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("category") ||
    "all"
  ).toLowerCase();
}

function renderPosts(posts) {
  if (!articleIndex) return;

  const selectedCategory =
    getSelectedCategory();

  const visiblePosts = posts
    .filter((post) => post.published !== false)
    .filter((post) => {
      if (selectedCategory === "all") {
        return true;
      }

      return (
        String(post.category).toLowerCase() ===
        selectedCategory
      );
    })
    .sort((a, b) => {
      return (
        new Date(b.date) -
        new Date(a.date)
      );
    });

  articleIndex.innerHTML = "";

  const column =
    document.createElement("div");

  column.className = "index-column";

  visiblePosts.forEach((post) => {
    column.appendChild(
      createPostItem(post)
    );
  });

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

  articleIndex.appendChild(column);
}

async function loadPosts() {
  if (!articleIndex) return;

  try {
    const response = await fetch(
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
      Array.isArray(data.posts)
        ? data.posts
        : [];

    renderPosts(posts);
  } catch (error) {
    console.error(error);

    articleIndex.innerHTML = `
      <p class="archive-error">
        기사를 불러오지 못했습니다.
      </p>
    `;
  }
}

loadPosts();