import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import * as controller from "./schema.controller.js";

export const schemaRoutes = Router();

schemaRoutes.use(authenticate);
const adminOnly = authorize("ADMIN");

schemaRoutes.get("/:resource/columns", asyncHandler(controller.listColumns));
schemaRoutes.post("/:resource/columns", adminOnly, asyncHandler(controller.addColumn));
schemaRoutes.patch("/:resource/columns/:column", adminOnly, asyncHandler(controller.renameColumn));
schemaRoutes.delete("/:resource/columns/:column", adminOnly, asyncHandler(controller.dropColumn));
