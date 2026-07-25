import bcrypt from "bcryptjs";
import { query, queryOne } from "../../config/database.js";
import { badRequest, unauthorized } from "../../utils/http-errors.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
} from "./tokens.js";

/** Register a new USER account and issue tokens. */
export async function register({ email, password, name }) {
  const existing = await queryOne("SELECT id FROM app_user WHERE email = $1", [email]);
  if (existing) throw badRequest("Email already registered");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await queryOne(
    `INSERT INTO app_user (email, name, password_hash, role)
     VALUES ($1, $2, $3, 'USER')
     RETURNING id, email, role`,
    [email, name ?? null, passwordHash],
  );
  return issueTokens(user);
}

/** Verify credentials and issue tokens. */
export async function login({ email, password }) {
  const user = await queryOne("SELECT * FROM app_user WHERE email = $1", [email]);
  if (!user || !user.is_active) throw unauthorized("Invalid credentials");

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) throw unauthorized("Invalid credentials");

  return issueTokens({ id: user.id, email: user.email, role: user.role });
}

/** Rotate a refresh token: revoke the old one and issue a fresh pair. */
export async function refresh(rawToken) {
  if (!rawToken) throw unauthorized("Invalid refresh token");

  const record = await queryOne(
    `SELECT rt.id, rt.user_id, rt.revoked, rt.expires_at, u.email, u.role
       FROM refresh_token rt
       JOIN app_user u ON u.id = rt.user_id
      WHERE rt.token_hash = $1`,
    [hashToken(rawToken)],
  );
  if (!record || record.revoked || new Date(record.expires_at) < new Date()) {
    throw unauthorized("Invalid refresh token");
  }

  await query("UPDATE refresh_token SET revoked = TRUE WHERE id = $1", [record.id]);
  return issueTokens({ id: record.user_id, email: record.email, role: record.role });
}

export async function logout(rawToken) {
  if (!rawToken) return;
  await query("UPDATE refresh_token SET revoked = TRUE WHERE token_hash = $1", [hashToken(rawToken)]);
}

export async function getCurrentUser(userId) {
  return queryOne("SELECT id, email, name, role, created_at FROM app_user WHERE id = $1", [userId]);
}

/** Create an access token and a stored refresh token for a user. */
async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  await query("INSERT INTO refresh_token (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
    user.id,
    hashToken(refreshToken),
    refreshTokenExpiry(),
  ]);
  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
}
