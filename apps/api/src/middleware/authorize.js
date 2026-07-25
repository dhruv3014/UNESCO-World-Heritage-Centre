import { unauthorized, forbidden } from "../utils/http-errors.js";

/**
 * Allows the request only if the authenticated user has one of the given roles.
 * Use after `authenticate`.
 *
 *   router.post("/", authenticate, authorize("ADMIN"), handler);
 */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden("Insufficient permissions"));
    next();
  };
}
