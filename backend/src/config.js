const dotenv = require("dotenv");

dotenv.config();

const required = ["DATABASE_URL", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Missing required environment variable: ${key}`);
  }
}

const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:4173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
};

module.exports = { config };
