import { query, queryOne } from "../config/db.js";
import { recordAudit } from "./audit.js";
import { getEffectiveFields } from "./schema.js";
import { badRequest, notFound } from "../utils/errors.js";

// --- helpers ---------------------------------------------------------------

function byName(fields) {
  return Object.fromEntries(fields.map((f) => [f.name, f]));
}

// Convert an incoming value into the correct JS type for its column.
function coerce(field, value) {
  if (value === "" || value === null || value === undefined) return null;
  if (field.type === "number" || field.type === "integer") {
    const n = Number(value);
    if (Number.isNaN(n)) throw badRequest(`Invalid number for ${field.name}`);
    return n;
  }
  if (field.type === "boolean") return value === true || value === "true";
  return value; // strings and dates pass through (pg parses date strings)
}

// Join primary-key values into a stable string id for the audit log.
function recordIdOf(resource, row) {
  return resource.pk.map((k) => row[k]).join(":");
}

// The list of columns to SELECT — only user-facing fields (never search_vector).
function columnList(fields) {
  return fields.map((f) => f.name).join(", ");
}

// Build "WHERE pk1 = $x AND pk2 = $y", appending to the given params array.
function pkWhere(resource, idValues, params, fields) {
  const map = byName(fields);
  const clauses = resource.pk.map((key) => {
    params.push(coerce(map[key], idValues[key]));
    return `${key} = $${params.length}`;
  });
  return clauses.join(" AND ");
}

// Build the search + filters conditions, appending to the params array.
function searchConditions(resource, { search, filters }, params, fields) {
  const map = byName(fields);
  const clauses = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    const searchable = fields.filter((f) => f.searchable);
    if (searchable.length) {
      const ors = searchable.map((f) => {
        params.push(term);
        return `${f.name} ILIKE $${params.length}`;
      });
      clauses.push(`(${ors.join(" OR ")})`);
    }
  }

  for (const cond of filters || []) {
    const field = map[cond.field];
    if (!field || !field.filterable) throw badRequest(`Field not filterable: ${cond.field}`);
    if (cond.value === "" || cond.value === undefined) continue;

    if (cond.op === "contains" && field.type === "string") {
      params.push(`%${cond.value}%`);
      clauses.push(`${field.name} ILIKE $${params.length}`);
    } else {
      const sqlOp = { eq: "=", gt: ">", gte: ">=", lt: "<", lte: "<=" }[cond.op];
      if (!sqlOp) throw badRequest(`Unsupported operator: ${cond.op}`);
      params.push(coerce(field, cond.value));
      clauses.push(`${field.name} ${sqlOp} $${params.length}`);
    }
  }
  return clauses;
}

// Pick only known columns from a snapshot (used for create / revert).
function pickColumns(fields, source, { includeId }) {
  const map = byName(fields);
  const out = {};
  for (const key of Object.keys(source || {})) {
    const field = map[key];
    if (!field) continue;
    if (!includeId && field.isId) continue;
    out[key] = source[key];
  }
  return out;
}

// --- low-level SQL (no auditing) -------------------------------------------

// RETURNING lists only user-facing columns, so internal columns like
// search_vector and deleted_at never leak into responses or the audit log.
async function insertRow(resource, values, fields) {
  const columns = Object.keys(values);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  return queryOne(
    `INSERT INTO ${resource.table} (${columns.join(", ")})
     VALUES (${placeholders.join(", ")}) RETURNING ${columnList(fields)}`,
    Object.values(values)
  );
}

async function updateRowByPk(resource, idValues, values, fields) {
  const params = [];
  const setClauses = Object.entries(values).map(([col, val]) => {
    params.push(val);
    return `${col} = $${params.length}`;
  });
  if (setClauses.length === 0) return getRecord(resource, idValues);
  const where = pkWhere(resource, idValues, params, fields);
  return queryOne(`UPDATE ${resource.table} SET ${setClauses.join(", ")} WHERE ${where} RETURNING ${columnList(fields)}`, params);
}

async function setDeletedAt(resource, idValues, value, fields) {
  const params = [value];
  const where = pkWhere(resource, idValues, params, fields);
  return queryOne(`UPDATE ${resource.table} SET deleted_at = $1 WHERE ${where} RETURNING ${columnList(fields)}`, params);
}

// --- public API ------------------------------------------------------------

// List records. `view` is "active" (default), "deleted" (trash) or "all".
export async function listRecords(resource, { page, limit, sort, order, search, filters, view = "active" }) {
  const fields = await getEffectiveFields(resource);
  const params = [];
  const clauses = searchConditions(resource, { search, filters }, params, fields);

  if (view === "active") clauses.push("deleted_at IS NULL");
  else if (view === "deleted") clauses.push("deleted_at IS NOT NULL");

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sortColumn = fields.some((f) => f.name === sort) ? sort : resource.defaultSort;
  const sortDir = order === "desc" ? "DESC" : "ASC";

  const totalRow = await queryOne(`SELECT COUNT(*)::int AS count FROM ${resource.table} ${where}`, params);
  const dataParams = [...params, limit, (page - 1) * limit];
  const data = await query(
    `SELECT ${columnList(fields)} FROM ${resource.table} ${where}
     ORDER BY ${sortColumn} ${sortDir}
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { data, total: totalRow.count, page, limit, totalPages: Math.max(1, Math.ceil(totalRow.count / limit)) };
}

export async function getRecord(resource, idValues, { includeDeleted = false } = {}) {
  const fields = await getEffectiveFields(resource);
  const params = [];
  const where = pkWhere(resource, idValues, params, fields);
  // Exclude soft-deleted rows in SQL (deleted_at is not in the SELECT list).
  const deletedClause = includeDeleted ? "" : " AND deleted_at IS NULL";
  const row = await queryOne(`SELECT ${columnList(fields)} FROM ${resource.table} WHERE ${where}${deletedClause}`, params);
  if (!row) throw notFound(`${resource.label} not found`);
  return row;
}

export async function createRecord(resource, body, actor) {
  const fields = await getEffectiveFields(resource);
  const values = {};
  for (const field of fields) {
    if (field.name in body) values[field.name] = coerce(field, body[field.name]);
  }
  for (const key of resource.pk) {
    if (values[key] === undefined || values[key] === null) throw badRequest(`Missing primary key: ${key}`);
  }
  const created = await insertRow(resource, values, fields);
  await recordAudit({ actor, action: "CREATE", table: resource.table, recordId: recordIdOf(resource, created), after: created });
  return created;
}

export async function updateRecord(resource, idValues, body, actor) {
  const fields = await getEffectiveFields(resource);
  const before = await getRecord(resource, idValues);
  const values = {};
  for (const field of fields) {
    if (!field.isId && field.name in body) values[field.name] = coerce(field, body[field.name]);
  }
  const after = await updateRowByPk(resource, idValues, values, fields);
  await recordAudit({ actor, action: "UPDATE", table: resource.table, recordId: recordIdOf(resource, after), before, after });
  return after;
}

// Soft delete: stamp deleted_at so the record can be restored later.
export async function deleteRecord(resource, idValues, actor) {
  const fields = await getEffectiveFields(resource);
  const before = await getRecord(resource, idValues);
  await setDeletedAt(resource, idValues, new Date(), fields);
  await recordAudit({ actor, action: "DELETE", table: resource.table, recordId: recordIdOf(resource, before), before });
  return { deleted: true };
}

export async function restoreRecord(resource, idValues, actor) {
  const fields = await getEffectiveFields(resource);
  // Fetch deleted_at explicitly so we can confirm the record is actually in trash.
  const params = [];
  const where = pkWhere(resource, idValues, params, fields);
  const existing = await queryOne(`SELECT ${columnList(fields)}, deleted_at FROM ${resource.table} WHERE ${where}`, params);
  if (!existing) throw notFound(`${resource.label} not found`);
  if (!existing.deleted_at) throw badRequest("Record is not deleted");

  const after = await setDeletedAt(resource, idValues, null, fields);
  await recordAudit({ actor, action: "RESTORE", table: resource.table, recordId: recordIdOf(resource, after), after });
  return after;
}

// Return every matching row (respecting search/filters) for CSV/JSON export.
export async function exportRecords(resource, { search, filters, view = "active" }) {
  const fields = await getEffectiveFields(resource);
  const params = [];
  const clauses = searchConditions(resource, { search, filters }, params, fields);
  if (view === "active") clauses.push("deleted_at IS NULL");
  else if (view === "deleted") clauses.push("deleted_at IS NOT NULL");
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(
    `SELECT ${columnList(fields)} FROM ${resource.table} ${where} ORDER BY ${resource.defaultSort} ASC`,
    params
  );
  return { fields, rows };
}

// Validate and insert many rows at once (admin bulk import).
export async function importRecords(resource, rows, actor) {
  if (!Array.isArray(rows) || rows.length === 0) throw badRequest("Import body must be a non-empty array");
  if (rows.length > 1000) throw badRequest("Import is limited to 1000 rows at a time");

  const fields = await getEffectiveFields(resource);
  const map = byName(fields);
  const results = { inserted: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const values = {};
      for (const key of Object.keys(row)) {
        if (map[key]) values[key] = coerce(map[key], row[key]);
      }
      for (const key of resource.pk) {
        if (values[key] === undefined || values[key] === null) throw new Error(`Missing primary key: ${key}`);
      }
      const created = await insertRow(resource, values, fields);
      await recordAudit({ actor, action: "CREATE", table: resource.table, recordId: recordIdOf(resource, created), after: created });
      results.inserted++;
    } catch (e) {
      results.failed++;
      results.errors.push({ row: i + 1, message: e.message });
    }
  }
  return results;
}

// Full-text search (only for resources flagged with `fullText`, e.g. sites).
export async function fullTextSearch(resource, q, limit) {
  if (!resource.fullText) throw badRequest("Full-text search is not available for this resource");
  if (!q || !q.trim()) return { data: [] };
  const fields = await getEffectiveFields(resource);
  const headlineColumn = resource.fullText.headline;
  const rows = await query(
    `SELECT ${columnList(fields)},
            ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank,
            ts_headline('english', coalesce(${headlineColumn}, ''), plainto_tsquery('english', $1),
                        'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=25, MinWords=5') AS highlight
       FROM ${resource.table}
      WHERE search_vector @@ plainto_tsquery('english', $1) AND deleted_at IS NULL
      ORDER BY rank DESC
      LIMIT $2`,
    [q.trim(), limit]
  );
  return { data: rows };
}

// --- revert (used by the history routes) -----------------------------------

// Reverse a past change and log the reversal as a new REVERT audit entry.
export async function revertChange(resource, log, actor) {
  if (!["CREATE", "UPDATE", "DELETE"].includes(log.action)) {
    throw badRequest("Only create, update and delete changes can be reverted");
  }
  const fields = await getEffectiveFields(resource);
  const idFrom = (snapshot) => Object.fromEntries(resource.pk.map((k) => [k, snapshot[k]]));

  if (log.action === "CREATE") {
    // Undo a create → soft-delete the row (still recoverable from trash).
    await setDeletedAt(resource, idFrom(log.after_data), new Date(), fields);
    await recordAudit({ actor, action: "REVERT", table: resource.table, recordId: log.record_id, before: log.after_data });
    return { reverted: "CREATE" };
  }

  if (log.action === "DELETE") {
    // Undo a soft-delete → clear deleted_at.
    const restored = await setDeletedAt(resource, idFrom(log.before_data), null, fields);
    await recordAudit({ actor, action: "REVERT", table: resource.table, recordId: log.record_id, after: restored });
    return { reverted: "DELETE", restored };
  }

  // Undo an update → restore the "before" snapshot.
  const idValues = idFrom(log.before_data);
  const current = await getRecord(resource, idValues, { includeDeleted: true });
  const restored = await updateRowByPk(resource, idValues, pickColumns(fields, log.before_data, { includeId: false }), fields);
  await recordAudit({ actor, action: "REVERT", table: resource.table, recordId: log.record_id, before: current, after: restored });
  return { reverted: "UPDATE", restored };
}
