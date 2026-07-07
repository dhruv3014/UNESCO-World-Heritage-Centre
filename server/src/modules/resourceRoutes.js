import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { RESOURCES, getResourceByKey } from "./resources.js";
import { badRequest, notFound } from "../utils/errors.js";
import * as service from "./resourceService.js";

const router = Router();

// Metadata about every table/field — powers the frontend's dynamic UI.
router.get("/meta", requireAuth, (_req, res) => {
  res.json({ resources: RESOURCES });
});

// Look up the resource named in the URL, or 404.
function resolve(req) {
  const resource = getResourceByKey(req.params.resource);
  if (!resource) throw notFound(`Unknown resource: ${req.params.resource}`);
  return resource;
}

// Collect primary-key values: single-key from the path, composite from the query.
function idValues(resource, req) {
  if (resource.pk.length === 1) return { [resource.pk[0]]: req.params.id };
  const values = {};
  for (const key of resource.pk) {
    if (req.query[key] === undefined) throw badRequest(`Missing key parameter: ${key}`);
    values[key] = req.query[key];
  }
  return values;
}

function parseFilters(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw badRequest("Invalid filters parameter (must be a JSON array)");
  }
}

// LIST — any signed-in user
router.get("/:resource", requireAuth, async (req, res, next) => {
  try {
    const resource = resolve(req);
    const result = await service.listRecords(resource, {
      page: Math.max(1, Number(req.query.page || 1)),
      limit: Math.min(200, Math.max(1, Number(req.query.limit || 25))),
      sort: req.query.sort || resource.defaultSort,
      order: req.query.order === "desc" ? "desc" : "asc",
      search: req.query.search,
      filters: parseFilters(req.query.filters),
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// DETAIL — composite keys use /detail?<keys>, single keys use /:id
router.get("/:resource/detail", requireAuth, async (req, res, next) => {
  try {
    const resource = resolve(req);
    res.json(await service.getRecord(resource, idValues(resource, req)));
  } catch (e) {
    next(e);
  }
});

router.get("/:resource/:id", requireAuth, async (req, res, next) => {
  try {
    const resource = resolve(req);
    if (resource.pk.length !== 1) throw badRequest("Use /detail?<keys> for composite-key resources");
    res.json(await service.getRecord(resource, idValues(resource, req)));
  } catch (e) {
    next(e);
  }
});

// CREATE — admin only
router.post("/:resource", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    res.status(201).json(await service.createRecord(resource, req.body, req.user));
  } catch (e) {
    next(e);
  }
});

// UPDATE — admin only
router.patch("/:resource/detail", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    res.json(await service.updateRecord(resource, idValues(resource, req), req.body, req.user));
  } catch (e) {
    next(e);
  }
});

router.patch("/:resource/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    if (resource.pk.length !== 1) throw badRequest("Use /detail?<keys> for composite-key resources");
    res.json(await service.updateRecord(resource, idValues(resource, req), req.body, req.user));
  } catch (e) {
    next(e);
  }
});

// DELETE — admin only
router.delete("/:resource/detail", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    res.json(await service.deleteRecord(resource, idValues(resource, req), req.user));
  } catch (e) {
    next(e);
  }
});

router.delete("/:resource/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    if (resource.pk.length !== 1) throw badRequest("Use /detail?<keys> for composite-key resources");
    res.json(await service.deleteRecord(resource, idValues(resource, req), req.user));
  } catch (e) {
    next(e);
  }
});

export default router;
