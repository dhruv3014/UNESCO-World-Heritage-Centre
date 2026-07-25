import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import * as controller from "./history.controller.js";

export const historyRoutes = Router();

historyRoutes.use(authenticate);

historyRoutes.get("/", asyncHandler(controller.listHistory));
historyRoutes.get("/schema-changes", asyncHandler(controller.listSchemaChanges));
historyRoutes.post("/:id/revert", authorize("ADMIN"), asyncHandler(controller.revert));
