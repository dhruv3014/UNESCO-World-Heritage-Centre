import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { RESOURCES, getResourceByKey } from "./resources.js";
import { getEffectiveFields } from "./schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { toCsv } from "../utils/csv.js";
import * as service from "./resourceService.js";

const router = Router();

// Metadata about every table/field (fields are resolved live, so admin-added
// columns show up automatically). Powers the frontend's dynamic UI.
router.get("/meta", requireAuth, async (_req, res, next) => {
  try {
    const resources = await Promise.all(
      RESOURCES.map(async (r) => ({
        key: r.key,
        table: r.table,
        label: r.label,
        description: r.description,
        pk: r.pk,
        defaultSort: r.defaultSort,
        fullText: Boolean(r.fullText),
        fields: await getEffectiveFields(r),
      }))
    );
    res.json({ resources });
  } catch (e) {
    next(e);
  }
});

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

// Full-text search (must be registered before /:resource/:id).
router.get("/:resource/search", requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    res.json(await service.fullTextSearch(resolve(req), req.query.q, limit));
  } catch (e) {
    next(e);
  }
});

// Export the current (filtered) view as CSV or JSON.
router.get("/:resource/export", requireAuth, async (req, res, next) => {
  try {
    const resource = resolve(req);
    const { fields, rows } = await service.exportRecords(resource, {
      search: req.query.search,
      filters: parseFilters(req.query.filters),
      view: req.query.view === "deleted" ? "deleted" : "active",
    });
    const format = req.query.format === "csv" ? "csv" : "json";
    if (format === "csv") {
      const csv = toCsv(fields.map((f) => f.name), rows);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${resource.key}.csv"`);
      res.send(csv);
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="${resource.key}.json"`);
      res.json(rows);
    }
  } catch (e) {
    next(e);
  }
});

// Bulk import (admin only, validated row by row).
router.post("/:resource/import", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    res.json(await service.importRecords(resolve(req), req.body?.rows, req.user));
  } catch (e) {
    next(e);
  }
});

// Detail for composite-key resources.
router.get("/:resource/detail", requireAuth, async (req, res, next) => {
  try {
    const resource = resolve(req);
    res.json(await service.getRecord(resource, idValues(resource, req)));
  } catch (e) {
    next(e);
  }
});

// LIST — any signed-in user. `view` = active (default) | deleted | all.
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
      view: ["deleted", "all"].includes(req.query.view) ? req.query.view : "active",
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Restore a soft-deleted record (admin only).
router.post("/:resource/:id/restore", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    if (resource.pk.length !== 1) throw badRequest("Use /restore-detail?<keys> for composite-key resources");
    res.json(await service.restoreRecord(resource, idValues(resource, req), req.user));
  } catch (e) {
    next(e);
  }
});

router.post("/:resource/restore-detail", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    res.json(await service.restoreRecord(resource, idValues(resource, req), req.user));
  } catch (e) {
    next(e);
  }
});

// DETAIL for single-key resources.
router.get("/:resource/:id", requireAuth, async (req, res, next) => {
  try {
    const resource = resolve(req);
    if (resource.pk.length !== 1) throw badRequest("Use /detail?<keys> for composite-key resources");
    res.json(await service.getRecord(resource, idValues(resource, req)));
  } catch (e) {
    next(e);
  }
});

// CREATE — admin only.
router.post("/:resource", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    res.status(201).json(await service.createRecord(resolve(req), req.body, req.user));
  } catch (e) {
    next(e);
  }
});

// UPDATE — admin only.
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

// DELETE (soft) — admin only.
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
