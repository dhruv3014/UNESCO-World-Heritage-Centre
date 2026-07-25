import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

/**
 * Centralised, validated configuration. Import this instead of reading
 * `process.env` directly anywhere else in the codebase.
 */
export const config = {
  env: nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 4000),

  // Comma-separated allowlist of frontend origins permitted by CORS.
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  database: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/whc",
    // Hosted databases (Neon, Render, etc.) require SSL.
    ssl: (process.env.DATABASE_SSL ?? String(isProduction)) === "true",
    // When true, the API will create schema + seed data if the DB is empty.
    initOnStart: (process.env.DATABASE_INIT_ON_START ?? "true") === "true",
  },

  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret_change_me",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret_change_me",
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
    refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  },

  admin: {
    email: process.env.ADMIN_EMAIL ?? "admin@whc.org",
    password: process.env.ADMIN_PASSWORD ?? "Admin@12345",
  },
};
