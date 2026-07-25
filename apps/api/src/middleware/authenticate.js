import { verifyAccessToken } from "../modules/auth/tokens.js";
import { unauthorized } from "../utils/http-errors.js";

/**
 * Verifies the `Authorization: Bearer <token>` access token and attaches the
 * decoded payload to `req.user` ({ sub, email, role }).
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(unauthorized("Missing access token"));
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(unauthorized("Invalid or expired access token"));
  }
}
