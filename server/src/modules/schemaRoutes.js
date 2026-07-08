import { Router } from "express";
import { query } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getResourceByKey } from "./resources.js";
import { ALLOWED_COLUMN_TYPES, invalidateColumns, getEffectiveFields } from "./schema.js";
import { badRequest, notFound } from "../utils/errors.js";

const router = Router();

// Only lowercase identifiers, so it is always safe to place them in SQL.
const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

function resolve(req) {
  const resource = getResourceByKey(req.params.resource);
  if (!resource) throw notFound(`Unknown resource: ${req.params.resource}`);
  return resource;
}

// Columns that are part of the curated core and must not be dropped/renamed.
function protectedColumns(resource) {
  const staticNames = resource.fields.map((f) => f.name);
  return new Set([...staticNames, "deleted_at", "search_vector"]);
}

async function logSchemaChange(summary) {
  await query("INSERT INTO schema_change_log (migration, summary) VALUES ($1, $2)", ["schema-editor", summary]);
}

// List the live columns of a table (handy for the schema editor UI).
router.get("/:resource/columns", requireAuth, async (req, res, next) => {
  try {
    res.json({ fields: await getEffectiveFields(resolve(req)) });
  } catch (e) {
    next(e);
  }
});

// Add a column. Body: { name, type } where type is one of ALLOWED_COLUMN_TYPES.
router.post("/:resource/columns", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    const { name, type } = req.body || {};
    if (!IDENTIFIER.test(name || "")) throw badRequest("Column name must be lowercase letters, numbers or underscores");
    const sqlType = ALLOWED_COLUMN_TYPES[type];
    if (!sqlType) throw badRequest(`Type must be one of: ${Object.keys(ALLOWED_COLUMN_TYPES).join(", ")}`);

    const fields = await getEffectiveFields(resource);
    if (fields.some((f) => f.name === name)) throw badRequest("A column with that name already exists");

    await query(`ALTER TABLE ${resource.table} ADD COLUMN ${name} ${sqlType}`);
    invalidateColumns(resource.table);
    await logSchemaChange(`Added column "${name}" (${type}) to ${resource.table}`);
    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Rename a custom column. Body: { newName }.
router.patch("/:resource/columns/:column", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    const { column } = req.params;
    const { newName } = req.body || {};
    if (protectedColumns(resource).has(column)) throw badRequest("Core columns cannot be renamed");
    if (!IDENTIFIER.test(column) || !IDENTIFIER.test(newName || "")) throw badRequest("Invalid column name");

    await query(`ALTER TABLE ${resource.table} RENAME COLUMN ${column} TO ${newName}`);
    invalidateColumns(resource.table);
    await logSchemaChange(`Renamed column "${column}" to "${newName}" on ${resource.table}`);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Drop a custom column.
router.delete("/:resource/columns/:column", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const resource = resolve(req);
    const { column } = req.params;
    if (protectedColumns(resource).has(column)) throw badRequest("Core columns cannot be dropped");
    if (!IDENTIFIER.test(column)) throw badRequest("Invalid column name");

    await query(`ALTER TABLE ${resource.table} DROP COLUMN ${column}`);
    invalidateColumns(resource.table);
    await logSchemaChange(`Dropped column "${column}" from ${resource.table}`);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
