import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import * as controller from "./feed.controller.js";

export const feedRoutes = Router();

feedRoutes.use(authenticate);

feedRoutes.get("/watch", asyncHandler(controller.listWatches));
feedRoutes.post("/watch", asyncHandler(controller.addWatch));
feedRoutes.delete("/watch", asyncHandler(controller.removeWatch));
feedRoutes.get("/feed", asyncHandler(controller.listFeed));
