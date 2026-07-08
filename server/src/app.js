import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { notFoundHandler, errorHandler } from "./middleware/error.js";
import authRoutes from "./auth/authRoutes.js";
import resourceRoutes from "./modules/resourceRoutes.js";
import historyRoutes from "./modules/historyRoutes.js";
import statsRoutes from "./modules/statsRoutes.js";
import schemaRoutes from "./modules/schemaRoutes.js";
import feedRoutes from "./modules/feedRoutes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      // Allow requests with no origin (curl, same-origin) or from an allowlisted origin.
      origin: (origin, callback) => {
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  if (env.nodeEnv !== "test") app.use(morgan("dev"));

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
  const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });

  app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/history", apiLimiter, historyRoutes);
  app.use("/api/stats", apiLimiter, statsRoutes);
  app.use("/api/schema", apiLimiter, schemaRoutes);
  // Feed routes (/watch, /feed) must come before the generic resource routes.
  app.use("/api", apiLimiter, feedRoutes);
  app.use("/api", apiLimiter, resourceRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
