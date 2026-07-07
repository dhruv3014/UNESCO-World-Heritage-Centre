import { HttpError } from "../utils/errors.js";

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Route not found" });
}

// Central error handler: known HttpErrors keep their status, everything else is 500.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
