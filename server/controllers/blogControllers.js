const db = require("../config/db");

const BLOG_STATUSES = ["draft", "published", "archived"];

// Get published blog posts for the public website
exports.getPublishedPosts = (req, res) => {
  db.query(
    `SELECT 
            bp.*,
            u.fullname AS author_name
         FROM blog_posts bp
         LEFT JOIN users u ON bp.author_id = u.id
         WHERE bp.status = 'published'
         ORDER BY bp.published_at DESC, bp.created_at DESC`,
    (err, results) => {
      if (err) {
        console.error("Error fetching published blog posts:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json(results);
    },
  );
};

// Admin: get every blog post
exports.getAllPosts = (req, res) => {
  db.query(
    `SELECT 
            bp.*,
            u.fullname AS author_name
         FROM blog_posts bp
         LEFT JOIN users u ON bp.author_id = u.id
         ORDER BY bp.created_at DESC`,
    (err, results) => {
      if (err) {
        console.error("Error fetching blog posts:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json(results);
    },
  );
};

// Get a single post
exports.getPost = (req, res) => {
  db.query(
    `SELECT 
            bp.*,
            u.fullname AS author_name
         FROM blog_posts bp
         LEFT JOIN users u ON bp.author_id = u.id
         WHERE bp.id = ?`,
    [req.params.id],
    (err, results) => {
      if (err) {
        console.error("Error fetching blog post:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(results[0]);
    },
  );
};

// Public: get a published post by slug
exports.getPostBySlug = (req, res) => {
  db.query(
    `SELECT 
            bp.*,
            u.fullname AS author_name
         FROM blog_posts bp
         LEFT JOIN users u ON bp.author_id = u.id
         WHERE bp.slug = ? AND bp.status = 'published'`,
    [req.params.slug],
    (err, results) => {
      if (err) {
        console.error("Error fetching blog post by slug:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(results[0]);
    },
  );
};

// Create a blog post
exports.createPost = (req, res) => {
  const {
    title,
    slug,
    excerpt,
    content,
    featured_image,
    status,
    published_at,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  if (!slug || !slug.trim()) {
    return res.status(400).json({ error: "slug is required" });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "content is required" });
  }

  const postStatus = status || "draft";

  if (!BLOG_STATUSES.includes(postStatus)) {
    return res.status(400).json({
      error: `status must be one of: ${BLOG_STATUSES.join(", ")}`,
    });
  }

  let publicationDate = published_at || null;

  if (postStatus === "published" && !publicationDate) {
    publicationDate = new Date();
  }

  const sql = `
        INSERT INTO blog_posts
        (
            title,
            slug,
            excerpt,
            content,
            featured_image,
            author_id,
            status,
            published_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

  db.query(
    sql,
    [
      title.trim(),
      slug.trim(),
      excerpt || null,
      content,
      featured_image || null,
      req.user?.id || null,
      postStatus,
      publicationDate,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            error: "A blog post with that slug already exists",
          });
        }

        console.error("Error creating blog post:", err);
        return res.status(500).json({ error: "Database error" });
      }

      db.query(
        `SELECT 
                    bp.*,
                    u.fullname AS author_name
                 FROM blog_posts bp
                 LEFT JOIN users u ON bp.author_id = u.id
                 WHERE bp.id = ?`,
        [result.insertId],
        (err2, rows) => {
          if (err2 || rows.length === 0) {
            return res.status(201).json({
              message: "Blog post created",
              id: result.insertId,
            });
          }

          res.status(201).json(rows[0]);
        },
      );
    },
  );
};

// Update a blog post
exports.updatePost = (req, res) => {
  const { id } = req.params;

  const {
    title,
    slug,
    excerpt,
    content,
    featured_image,
    status,
    published_at,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  if (!slug || !slug.trim()) {
    return res.status(400).json({ error: "slug is required" });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "content is required" });
  }

  if (!BLOG_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${BLOG_STATUSES.join(", ")}`,
    });
  }

  let publicationDate = published_at || null;

  if (status === "published" && !publicationDate) {
    publicationDate = new Date();
  }

  const sql = `
        UPDATE blog_posts
        SET
            title = ?,
            slug = ?,
            excerpt = ?,
            content = ?,
            featured_image = ?,
            status = ?,
            published_at = ?
        WHERE id = ?
    `;

  db.query(
    sql,
    [
      title.trim(),
      slug.trim(),
      excerpt || null,
      content,
      featured_image || null,
      status,
      publicationDate,
      id,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            error: "A blog post with that slug already exists",
          });
        }

        console.error("Error updating blog post:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Blog post not found",
        });
      }

      db.query(
        `SELECT 
                    bp.*,
                    u.fullname AS author_name
                 FROM blog_posts bp
                 LEFT JOIN users u ON bp.author_id = u.id
                 WHERE bp.id = ?`,
        [id],
        (err2, rows) => {
          if (err2 || rows.length === 0) {
            return res.json({
              message: "Blog post updated",
            });
          }

          res.json(rows[0]);
        },
      );
    },
  );
};

// Delete a blog post
exports.deletePost = (req, res) => {
  db.query(
    "SELECT * FROM blog_posts WHERE id = ?",
    [req.params.id],
    (err, results) => {
      if (err) {
        console.error("Error fetching blog post for deletion:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({
          error: "Blog post not found",
        });
      }

      const post = results[0];

      db.query(
        `INSERT INTO trash
                (
                    entity_type,
                    entity_id,
                    entity_data,
                    deleted_by
                )
                VALUES (?, ?, ?, ?)`,
        ["blog_post", post.id, JSON.stringify(post), req.user?.id || null],
        (trashErr) => {
          if (trashErr) {
            console.error("Error moving blog post to trash:", trashErr);
            return res.status(500).json({
              error: "Could not move blog post to trash",
            });
          }

          db.query(
            "DELETE FROM blog_posts WHERE id = ?",
            [req.params.id],
            (deleteErr, result) => {
              if (deleteErr) {
                console.error("Error deleting blog post:", deleteErr);
                return res.status(500).json({
                  error: "Database error",
                });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({
                  error: "Blog post not found",
                });
              }

              res.json({
                message: "Blog post moved to trash",
              });
            },
          );
        },
      );
    },
  );
};
