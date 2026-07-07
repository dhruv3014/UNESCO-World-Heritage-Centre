import { verifyAccessToken } from "../auth/tokens.js";
import { unauthorized, forbidden } from "../utils/errors.js";

// Verifies the Bearer access token and attaches the user to req.user.
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next(unauthorized("Missing access token"));
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(unauthorized("Invalid or expired access token"));
  }
}

// Allows the request only if the user has one of the given roles.
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden("Insufficient permissions"));
    next();
  };
}
