import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { getStats } from "./stats.controller.js";

export const statsRoutes = Router();

statsRoutes.get("/", authenticate, asyncHandler(getStats));
