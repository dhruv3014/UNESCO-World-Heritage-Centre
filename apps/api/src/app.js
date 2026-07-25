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
        if (!origin) return callback(null, true);

        for (const allowedOrigin of config.clientOrigins) {
          if (allowedOrigin === origin) return callback(null, true);
          if (allowedOrigin === "*") return callback(null, true);
        }

        if (!config.isProduction && /^(https?:)?\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }

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
