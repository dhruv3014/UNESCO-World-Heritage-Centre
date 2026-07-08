import { Router } from "express";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest } from "../utils/errors.js";
import * as authService from "./authService.js";

const router = Router();
const REFRESH_COOKIE = "whc_refresh";

const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax",
  path: "/api/auth",
  maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions);
}

// Basic input checks kept inline so the flow is easy to follow.
function validateCredentials(body) {
  const { email, password, name } = body;
  if (!email || typeof email !== "string" || !email.includes("@")) throw badRequest("A valid email is required");
  if (!password || password.length < 8) throw badRequest("Password must be at least 8 characters");
  return { email, password, name };
}

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = validateCredentials(req.body);
    const { accessToken, refreshToken, user } = await authService.register(email, password, name);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ accessToken, user });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = validateCredentials(req.body);
    const { accessToken, refreshToken, user } = await authService.login(email, password);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  } catch (e) {
    next(e);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    res.json({ user: await authService.getUser(req.user.sub) });
  } catch (e) {
    next(e);
  }
});

export default router;
