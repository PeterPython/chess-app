const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { config } = require("./config");

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
    },
    config.jwtSecret,
    { expiresIn: "7d" },
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  createToken,
  requireAuth,
};
