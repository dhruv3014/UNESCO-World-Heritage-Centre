import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";

// Access tokens are signed JWTs sent to the client and kept in memory.
export function signAccessToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

// Refresh tokens are random opaque strings; only their SHA-256 hash is stored.
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshExpiryDate() {
  return new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}
