const {
  isAuthenticated
} = require(
  "../lib/admin-auth"
);

const {
  readPostsFile,
  writePostsFile
} = require(
  "../lib/github-content"
);

function normalizePost(post) {
  const category =
    String(
      post.category ||
      "article"
    ).toLowerCase();

  return {
    id:
      String(post.id || "").trim(),

    title:
      String(post.title || "").trim(),

    author:
      String(post.author || "").trim(),

    date:
      String(post.date || "").trim(),

    category,

    subcategory:
      String(
        post.subcategory ||
        category.toUpperCase()
      ).trim(),

    thumbnail:
      String(
        post.thumbnail || ""
      ).trim(),

    imageAlt:
      String(
        post.imageAlt ||
        post.title ||
        ""
      ).trim(),

    imageCaption:
      String(
        post.imageCaption || ""
      ).trim(),

    imageSource:
      String(
        post.imageSource || ""
      ).trim(),

    published:
      post.published !== false,

    body:
      String(post.body || "")
  };
}

module.exports =
  async function handler(
    req,
    res
  ) {
    if (!isAuthenticated(req)) {
      return res
        .status(401)
        .json({
          error:
            "로그인이 필요합니다."
        });
    }

    try {
      const {
        sha,
        data
      } = await readPostsFile();

      const posts =
        Array.isArray(data.posts)
          ? data.posts
          : [];

      if (req.method === "GET") {
        return res
          .status(200)
          .json({
            posts
          });
      }

      if (req.method !== "POST") {
        return res
          .status(405)
          .json({
            error:
              "허용되지 않은 요청입니다."
          });
      }

      const action =
        req.body?.action;

      if (action === "delete") {
        const id =
          String(
            req.body?.id || ""
          );

        const nextPosts =
          posts.filter(
            (post) =>
              post.id !== id
          );

        await writePostsFile(
          {
            posts: nextPosts
          },
          sha,
          `Delete post: ${id}`
        );

        return res
          .status(200)
          .json({
            success: true,
            posts: nextPosts
          });
      }

      if (action !== "save") {
        return res
          .status(400)
          .json({
            error:
              "올바르지 않은 작업입니다."
          });
      }

      const post =
        normalizePost(
          req.body?.post || {}
        );

      if (
        !post.id ||
        !post.title ||
        !post.author ||
        !post.date
      ) {
        return res
          .status(400)
          .json({
            error:
              "제목, 작성자, 날짜가 필요합니다."
          });
      }

      const existingIndex =
        posts.findIndex(
          (item) =>
            item.id === post.id
        );

      const nextPosts =
        [...posts];

      if (existingIndex >= 0) {
        nextPosts[
          existingIndex
        ] = post;
      } else {
        nextPosts.push(post);
      }

      await writePostsFile(
        {
          posts: nextPosts
        },
        sha,
        existingIndex >= 0
          ? `Update post: ${post.title}`
          : `Create post: ${post.title}`
      );

      return res
        .status(200)
        .json({
          success: true,
          posts: nextPosts
        });
    } catch (error) {
      console.error(error);

      return res
        .status(500)
        .json({
          error:
            error.message ||
            "게시글 처리에 실패했습니다."
        });
    }
  };