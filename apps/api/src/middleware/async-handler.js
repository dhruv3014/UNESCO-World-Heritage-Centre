/**
 * Wraps an async route handler so rejected promises are forwarded to Express's
 * error handler. Lets controllers stay clean — no try/catch in every route.
 *
 *   router.get("/", asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
