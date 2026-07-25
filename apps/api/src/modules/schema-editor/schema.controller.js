import { query } from "../../config/database.js";
import { getResourceByKey } from "../resources/resource.registry.js";
import { ALLOWED_COLUMN_TYPES, invalidateColumnCache, getEffectiveFields } from "../resources/resource.fields.js";
import { badRequest, notFound } from "../../utils/http-errors.js";

// Only lowercase identifiers, so column names are always safe to place in SQL.
const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

function resolveResource(req) {
  const resource = getResourceByKey(req.params.resource);
  if (!resource) throw notFound(`Unknown resource: ${req.params.resource}`);
  return resource;
}

/** Columns that are part of the curated core and must not be dropped/renamed. */
function protectedColumns(resource) {
  return new Set([...resource.fields.map((field) => field.name), "deleted_at", "search_vector"]);
}

async function logSchemaChange(summary) {
  await query("INSERT INTO schema_change_log (migration, summary) VALUES ($1, $2)", ["schema-editor", summary]);
}

/** GET /api/schema/:resource/columns — live columns of a table. */
export async function listColumns(req, res) {
  res.json({ fields: await getEffectiveFields(resolveResource(req)) });
}

/** POST /api/schema/:resource/columns — add a column. Body: { name, type }. */
export async function addColumn(req, res) {
  const resource = resolveResource(req);
  const { name, type } = req.body ?? {};
  if (!IDENTIFIER.test(name ?? "")) throw badRequest("Column name must be lowercase letters, numbers or underscores");

  const sqlType = ALLOWED_COLUMN_TYPES[type];
  if (!sqlType) throw badRequest(`Type must be one of: ${Object.keys(ALLOWED_COLUMN_TYPES).join(", ")}`);

  const fields = await getEffectiveFields(resource);
  if (fields.some((field) => field.name === name)) throw badRequest("A column with that name already exists");

  await query(`ALTER TABLE ${resource.table} ADD COLUMN ${name} ${sqlType}`);
  invalidateColumnCache(resource.table);
  await logSchemaChange(`Added column "${name}" (${type}) to ${resource.table}`);
  res.status(201).json({ ok: true });
}

/** PATCH /api/schema/:resource/columns/:column — rename a custom column. */
export async function renameColumn(req, res) {
  const resource = resolveResource(req);
  const { column } = req.params;
  const { newName } = req.body ?? {};
  if (protectedColumns(resource).has(column)) throw badRequest("Core columns cannot be renamed");
  if (!IDENTIFIER.test(column) || !IDENTIFIER.test(newName ?? "")) throw badRequest("Invalid column name");

  await query(`ALTER TABLE ${resource.table} RENAME COLUMN ${column} TO ${newName}`);
  invalidateColumnCache(resource.table);
  await logSchemaChange(`Renamed column "${column}" to "${newName}" on ${resource.table}`);
  res.json({ ok: true });
}

/** DELETE /api/schema/:resource/columns/:column — drop a custom column. */
export async function dropColumn(req, res) {
  const resource = resolveResource(req);
  const { column } = req.params;
  if (protectedColumns(resource).has(column)) throw badRequest("Core columns cannot be dropped");
  if (!IDENTIFIER.test(column)) throw badRequest("Invalid column name");

  await query(`ALTER TABLE ${resource.table} DROP COLUMN ${column}`);
  invalidateColumnCache(resource.table);
  await logSchemaChange(`Dropped column "${column}" from ${resource.table}`);
  res.json({ ok: true });
}
