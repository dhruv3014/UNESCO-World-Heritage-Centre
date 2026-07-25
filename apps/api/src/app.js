import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config/env.js";
import { apiRouter } from "./routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error-handler.js";

/** Build and configure the Express application. */
export function createApp() {
  const app = express();

  // Render/other proxies sit in front of the app; trust them for secure cookies.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      // Allow same-origin/no-origin requests and any allowlisted frontend origin.
      origin(origin, callback) {
        // No origin (same origin or non-browser clients) — allow.
        if (!origin) return callback(null, true);

        // Exact-match against configured client origins.
        if (config.clientOrigins.includes(origin)) return callback(null, true);

        // In development allow localhost/127.0.0.1 origins to simplify local testing.
        if (!config.isProduction && /^(https?:)?\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }

        // Otherwise block the origin.
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  if (!config.isProduction) app.use(morgan("dev"));

  // Rate limiting: stricter on auth, generous on the rest of the API.
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));
  app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 300 }), apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
