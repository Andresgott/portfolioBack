const express = require("express");
const cors = require("cors");
const pg = require("pg");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid"); // ✅ genera ids únicos (seguro y local)

dotenv.config();

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,             // 🔥 Render exige conexión SSL
    rejectUnauthorized: false, // 🔥 evita problemas con el certificado
  },
});


app.use(cors());
app.use(express.json());

/* -------------------- BLOG POSTS CRUD -------------------- */

// --- GET all blog posts
app.get("/api/posts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM blog_posts ORDER BY date DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- GET single post by slug
app.get("/api/posts/:slug", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM blog_posts WHERE slug = $1", [req.params.slug]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching post:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- CREATE new blog post
app.post("/api/posts", async (req, res) => {
  const { title, slug, image_url, content, excerpt, author, badge } = req.body;
  try {
    // 🆔 Generar UUID en Node
    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO blog_posts (id, title, slug, image_url, content, excerpt, author, badge, date, likes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 0)
       RETURNING *`,
      [id, title, slug, image_url, content, excerpt, author, badge]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error saving post:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE blog post
app.put("/api/posts/:id", async (req, res) => {
  const { title, slug, image_url, content, excerpt, author, badge } = req.body;
  try {
    const result = await pool.query(
      `UPDATE blog_posts
       SET title=$1, slug=$2, image_url=$3, content=$4, excerpt=$5, author=$6, badge=$7, date=NOW()
       WHERE id=$8 RETURNING *`,
      [title, slug, image_url, content, excerpt, author, badge, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating post:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- DELETE blog post
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM blog_posts WHERE id = $1 RETURNING id", [
      req.params.id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting post:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- LIKES -------------------- */
app.post("/api/posts/:id/like", async (req, res) => {
  try {
    await pool.query("UPDATE blog_posts SET likes = likes + 1 WHERE id = $1", [req.params.id]);
    res.json({ message: "Like added" });
  } catch (err) {
    console.error("❌ Error liking post:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- COMMENTS -------------------- */
app.get("/api/posts/:id/comments", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM blog_comments WHERE post_id = $1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching comments:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/posts/:id/comments", async (req, res) => {
  const { name, comment } = req.body;
  try {
    const id = uuidv4();
    await pool.query(
      "INSERT INTO blog_comments (id, post_id, name, comment, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [id, req.params.id, name, comment]
    );
    res.status(201).json({ message: "Comment added" });
  } catch (err) {
    console.error("❌ Error adding comment:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- SERVER -------------------- */
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
