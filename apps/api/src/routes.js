import { Router } from "express";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { resourceRoutes } from "./modules/resources/resource.routes.js";
import { historyRoutes } from "./modules/audit/history.routes.js";
import { schemaRoutes } from "./modules/schema-editor/schema.routes.js";
import { feedRoutes } from "./modules/feed/feed.routes.js";
import { statsRoutes } from "./modules/stats/stats.routes.js";

/** All API routes, mounted by the app under /api. */
export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

apiRouter.use("/auth", authRoutes);
apiRouter.use("/history", historyRoutes);
apiRouter.use("/schema", schemaRoutes);
apiRouter.use("/stats", statsRoutes);

// Feed routes (/watch, /feed) must be mounted before the generic resource
// routes so they aren't captured by "/:resource".
apiRouter.use("/", feedRoutes);
apiRouter.use("/", resourceRoutes);
