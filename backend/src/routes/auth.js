const express = require("express");
const { query } = require("../db");
const { comparePassword, createToken, hashPassword, requireAuth } = require("../auth");

const authRouter = express.Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (username.length < 2) {
      return res.status(400).json({ error: "Username must be at least 2 characters." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await query("select id from users where lower(username) = lower($1)", [username]);
    if (existing.rows.length) {
      return res.status(409).json({ error: "Username already exists." });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await query(
      `
        insert into users (username, password_hash)
        values ($1, $2)
        returning id, username, created_at
      `,
      [username, passwordHash],
    );

    const user = inserted.rows[0];
    const token = createToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    const result = await query(
      `
        select id, username, password_hash, created_at
        from users
        where lower(username) = lower($1)
      `,
      [username],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await query("select id, username, created_at from users where id = $1", [req.user.sub]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = { authRouter };
