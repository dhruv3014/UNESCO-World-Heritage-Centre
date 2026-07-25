import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { config } from "../../config/env.js";

// Access tokens: short-lived signed JWTs the client keeps in memory.
export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.auth.accessSecret, {
    expiresIn: config.auth.accessTokenTtl,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.auth.accessSecret);
}

// Refresh tokens: random opaque strings; only their SHA-256 hash is stored in the DB.
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry() {
  return new Date(Date.now() + config.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}
