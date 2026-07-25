import { RESOURCES, getResourceByKey } from "./resource.registry.js";
import { getEffectiveFields } from "./resource.fields.js";
import { badRequest, notFound } from "../../utils/http-errors.js";
import { toCsv } from "../../utils/csv.js";
import * as resourceService from "./resource.service.js";

/** Resolve the resource named in the URL, or throw 404. */
function resolveResource(req) {
  const resource = getResourceByKey(req.params.resource);
  if (!resource) throw notFound(`Unknown resource: ${req.params.resource}`);
  return resource;
}

/** Collect primary-key values: single-key from the path, composite from the query. */
function readPrimaryKey(resource, req) {
  if (resource.primaryKey.length === 1) return { [resource.primaryKey[0]]: req.params.id };
  const values = {};
  for (const key of resource.primaryKey) {
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

const parseView = (raw) => (["deleted", "all"].includes(raw) ? raw : "active");

/** GET /api/meta — table + field metadata (fields resolved live from the DB). */
export async function meta(_req, res) {
  const resources = await Promise.all(
    RESOURCES.map(async (resource) => ({
      key: resource.key,
      table: resource.table,
      label: resource.label,
      description: resource.description,
      primaryKey: resource.primaryKey,
      defaultSort: resource.defaultSort,
      fullText: Boolean(resource.fullText),
      fields: await getEffectiveFields(resource),
    })),
  );
  res.json({ resources });
}

export async function list(req, res) {
  const resource = resolveResource(req);
  const result = await resourceService.listRecords(resource, {
    page: Math.max(1, Number(req.query.page ?? 1)),
    limit: Math.min(200, Math.max(1, Number(req.query.limit ?? 25))),
    sort: req.query.sort ?? resource.defaultSort,
    order: req.query.order === "desc" ? "desc" : "asc",
    search: req.query.search,
    filters: parseFilters(req.query.filters),
    view: parseView(req.query.view),
  });
  res.json(result);
}

export async function detail(req, res) {
  const resource = resolveResource(req);
  res.json(await resourceService.getRecord(resource, readPrimaryKey(resource, req)));
}

export async function detailById(req, res) {
  const resource = resolveResource(req);
  if (resource.primaryKey.length !== 1) throw badRequest("Use /detail?<keys> for composite-key resources");
  res.json(await resourceService.getRecord(resource, readPrimaryKey(resource, req)));
}

export async function create(req, res) {
  const resource = resolveResource(req);
  res.status(201).json(await resourceService.createRecord(resource, req.body, req.user));
}

export async function update(req, res) {
  const resource = resolveResource(req);
  res.json(await resourceService.updateRecord(resource, readPrimaryKey(resource, req), req.body, req.user));
}

export async function remove(req, res) {
  const resource = resolveResource(req);
  res.json(await resourceService.deleteRecord(resource, readPrimaryKey(resource, req), req.user));
}

export async function restore(req, res) {
  const resource = resolveResource(req);
  res.json(await resourceService.restoreRecord(resource, readPrimaryKey(resource, req), req.user));
}

export async function search(req, res) {
  const resource = resolveResource(req);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
  res.json(await resourceService.fullTextSearch(resource, req.query.q, limit));
}

export async function exportData(req, res) {
  const resource = resolveResource(req);
  const { fields, rows } = await resourceService.exportRecords(resource, {
    search: req.query.search,
    filters: parseFilters(req.query.filters),
    view: req.query.view === "deleted" ? "deleted" : "active",
  });

  if (req.query.format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${resource.key}.csv"`);
    res.send(toCsv(fields.map((field) => field.name), rows));
  } else {
    res.setHeader("Content-Disposition", `attachment; filename="${resource.key}.json"`);
    res.json(rows);
  }
}

export async function importData(req, res) {
  const resource = resolveResource(req);
  res.json(await resourceService.importRecords(resource, req.body?.rows, req.user));
}
