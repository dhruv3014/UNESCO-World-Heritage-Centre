import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import * as controller from "./resource.controller.js";

export const resourceRoutes = Router();

// Everything here requires a signed-in user.
resourceRoutes.use(authenticate);

const adminOnly = authorize("ADMIN");

// Metadata for the whole dynamic UI.
resourceRoutes.get("/meta", asyncHandler(controller.meta));

// Literal sub-paths must be registered before the "/:id" param route.
resourceRoutes.get("/:resource/search", asyncHandler(controller.search));
resourceRoutes.get("/:resource/export", asyncHandler(controller.exportData));
resourceRoutes.get("/:resource/detail", asyncHandler(controller.detail));
resourceRoutes.post("/:resource/import", adminOnly, asyncHandler(controller.importData));
resourceRoutes.post("/:resource/restore-detail", adminOnly, asyncHandler(controller.restore));

// Collection + single-record routes.
resourceRoutes.get("/:resource", asyncHandler(controller.list));
resourceRoutes.post("/:resource", adminOnly, asyncHandler(controller.create));
resourceRoutes.post("/:resource/:id/restore", adminOnly, asyncHandler(controller.restore));
resourceRoutes.get("/:resource/:id", asyncHandler(controller.detailById));
resourceRoutes.patch("/:resource/detail", adminOnly, asyncHandler(controller.update));
resourceRoutes.patch("/:resource/:id", adminOnly, asyncHandler(controller.update));
resourceRoutes.delete("/:resource/detail", adminOnly, asyncHandler(controller.remove));
resourceRoutes.delete("/:resource/:id", adminOnly, asyncHandler(controller.remove));
