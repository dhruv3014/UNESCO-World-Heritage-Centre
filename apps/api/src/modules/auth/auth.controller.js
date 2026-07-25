import { config } from "../../config/env.js";
import { badRequest } from "../../utils/http-errors.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE = "whc_refresh";

/**
 * Refresh-token cookie options.
 *
 * In production the frontend (Vercel) and API (Render) live on different
 * domains, so the cookie must be `SameSite=None; Secure` to be sent on
 * cross-site requests. Locally we use `Lax` over http.
 */
const refreshCookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? "none" : "lax",
  path: "/api/auth",
  maxAge: config.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions);
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });
}

function validateCredentials(body) {
  const { email, password, name } = body ?? {};
  if (!email || typeof email !== "string" || !email.includes("@")) throw badRequest("A valid email is required");
  if (!password || password.length < 8) throw badRequest("Password must be at least 8 characters");
  return { email, password, name };
}

export async function register(req, res) {
  const { accessToken, refreshToken, user } = await authService.register(validateCredentials(req.body));
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ accessToken, user });
}

export async function login(req, res) {
  const { accessToken, refreshToken, user } = await authService.login(validateCredentials(req.body));
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user });
}

export async function refresh(req, res) {
  const { accessToken, refreshToken, user } = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user });
}

export async function logout(req, res) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  res.status(204).end();
}

export async function me(req, res) {
  res.json({ user: await authService.getCurrentUser(req.user.sub) });
}
