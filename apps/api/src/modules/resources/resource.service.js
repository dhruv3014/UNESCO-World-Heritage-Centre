import { query, queryOne } from "../../config/database.js";
import { recordAudit } from "../audit/audit.service.js";
import { getEffectiveFields } from "./resource.fields.js";
import { badRequest, notFound } from "../../utils/http-errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const indexByName = (fields) => Object.fromEntries(fields.map((field) => [field.name, field]));

/** Convert an incoming value to the correct JS type for its column. */
function coerce(field, value) {
  if (value === "" || value === null || value === undefined) return null;
  if (field.type === "number" || field.type === "integer") {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) throw badRequest(`Invalid number for ${field.name}`);
    return parsed;
  }
  if (field.type === "boolean") return value === true || value === "true";
  return value; // strings and dates pass straight through (pg parses date strings)
}

/** Join primary-key values into a stable id string for the audit log / watchlist. */
const recordIdOf = (resource, row) => resource.primaryKey.map((key) => row[key]).join(":");

/** The columns to SELECT / RETURN — user-facing only (never search_vector / deleted_at). */
const columnList = (fields) => fields.map((field) => field.name).join(", ");

/** Build "pk1 = $x AND pk2 = $y", appending values to `params`. */
function primaryKeyClause(resource, idValues, params, fields) {
  const map = indexByName(fields);
  return resource.primaryKey
    .map((key) => {
      params.push(coerce(map[key], idValues[key]));
      return `${key} = $${params.length}`;
    })
    .join(" AND ");
}

/** Build the search + filter conditions, appending values to `params`. */
function searchConditions(resource, { search, filters }, params, fields) {
  const map = indexByName(fields);
  const clauses = [];

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    const searchable = fields.filter((field) => field.searchable);
    if (searchable.length) {
      const ors = searchable.map((field) => {
        params.push(term);
        return `${field.name} ILIKE $${params.length}`;
      });
      clauses.push(`(${ors.join(" OR ")})`);
    }
  }

  for (const condition of filters ?? []) {
    const field = map[condition.field];
    if (!field?.filterable) throw badRequest(`Field not filterable: ${condition.field}`);
    if (condition.value === "" || condition.value === undefined) continue;

    if (condition.op === "contains" && field.type === "string") {
      params.push(`%${condition.value}%`);
      clauses.push(`${field.name} ILIKE $${params.length}`);
    } else {
      const sqlOperator = { eq: "=", gt: ">", gte: ">=", lt: "<", lte: "<=" }[condition.op];
      if (!sqlOperator) throw badRequest(`Unsupported operator: ${condition.op}`);
      params.push(coerce(field, condition.value));
      clauses.push(`${field.name} ${sqlOperator} $${params.length}`);
    }
  }
  return clauses;
}

/** Keep only known columns from a snapshot (used for create / revert). */
function pickColumns(fields, source, { includeId }) {
  const map = indexByName(fields);
  const result = {};
  for (const key of Object.keys(source ?? {})) {
    const field = map[key];
    if (!field || (!includeId && field.isId)) continue;
    result[key] = source[key];
  }
  return result;
}

// Low-level writes. RETURNING lists user-facing columns only, so internal
// columns (search_vector, deleted_at) never leak into responses or audit logs.
async function insertRow(resource, values, fields) {
  const columns = Object.keys(values);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  return queryOne(
    `INSERT INTO ${resource.table} (${columns.join(", ")})
     VALUES (${placeholders.join(", ")}) RETURNING ${columnList(fields)}`,
    Object.values(values),
  );
}

async function updateRow(resource, idValues, values, fields) {
  const params = [];
  const assignments = Object.entries(values).map(([column, value]) => {
    params.push(value);
    return `${column} = $${params.length}`;
  });
  if (assignments.length === 0) return getRecord(resource, idValues);
  const where = primaryKeyClause(resource, idValues, params, fields);
  return queryOne(`UPDATE ${resource.table} SET ${assignments.join(", ")} WHERE ${where} RETURNING ${columnList(fields)}`, params);
}

async function setDeletedAt(resource, idValues, value, fields) {
  const params = [value];
  const where = primaryKeyClause(resource, idValues, params, fields);
  return queryOne(`UPDATE ${resource.table} SET deleted_at = $1 WHERE ${where} RETURNING ${columnList(fields)}`, params);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** List records. `view` is "active" (default), "deleted" (trash) or "all". */
export async function listRecords(resource, { page, limit, sort, order, search, filters, view = "active" }) {
  const fields = await getEffectiveFields(resource);
  const params = [];
  const clauses = searchConditions(resource, { search, filters }, params, fields);
  if (view === "active") clauses.push("deleted_at IS NULL");
  else if (view === "deleted") clauses.push("deleted_at IS NOT NULL");

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sortColumn = fields.some((field) => field.name === sort) ? sort : resource.defaultSort;
  const sortDirection = order === "desc" ? "DESC" : "ASC";

  const totalRow = await queryOne(`SELECT COUNT(*)::int AS count FROM ${resource.table} ${where}`, params);
  const pageParams = [...params, limit, (page - 1) * limit];
  const rows = await query(
    `SELECT ${columnList(fields)} FROM ${resource.table} ${where}
     ORDER BY ${sortColumn} ${sortDirection}
     LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams,
  );

  return { data: rows, total: totalRow.count, page, limit, totalPages: Math.max(1, Math.ceil(totalRow.count / limit)) };
}

export async function getRecord(resource, idValues, { includeDeleted = false } = {}) {
  const fields = await getEffectiveFields(resource);
  const params = [];
  const where = primaryKeyClause(resource, idValues, params, fields);
  // Exclude soft-deleted rows in SQL (deleted_at is not part of columnList).
  const activeOnly = includeDeleted ? "" : " AND deleted_at IS NULL";
  const row = await queryOne(`SELECT ${columnList(fields)} FROM ${resource.table} WHERE ${where}${activeOnly}`, params);
  if (!row) throw notFound(`${resource.label} not found`);
  return row;
}

export async function createRecord(resource, body, actor) {
  const fields = await getEffectiveFields(resource);
  const values = {};
  for (const field of fields) {
    if (field.name in body) values[field.name] = coerce(field, body[field.name]);
  }
  for (const key of resource.primaryKey) {
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
  const after = await updateRow(resource, idValues, values, fields);
  await recordAudit({ actor, action: "UPDATE", table: resource.table, recordId: recordIdOf(resource, after), before, after });
  return after;
}

/** Soft delete: stamp deleted_at so the record can be restored later. */
export async function deleteRecord(resource, idValues, actor) {
  const fields = await getEffectiveFields(resource);
  const before = await getRecord(resource, idValues);
  await setDeletedAt(resource, idValues, new Date(), fields);
  await recordAudit({ actor, action: "DELETE", table: resource.table, recordId: recordIdOf(resource, before), before });
  return { deleted: true };
}

export async function restoreRecord(resource, idValues, actor) {
  const fields = await getEffectiveFields(resource);
  const params = [];
  const where = primaryKeyClause(resource, idValues, params, fields);
  const existing = await queryOne(`SELECT ${columnList(fields)}, deleted_at FROM ${resource.table} WHERE ${where}`, params);
  if (!existing) throw notFound(`${resource.label} not found`);
  if (!existing.deleted_at) throw badRequest("Record is not deleted");

  const after = await setDeletedAt(resource, idValues, null, fields);
  await recordAudit({ actor, action: "RESTORE", table: resource.table, recordId: recordIdOf(resource, after), after });
  return after;
}

/** Return every matching row (respecting search/filters/view) for CSV/JSON export. */
export async function exportRecords(resource, { search, filters, view = "active" }) {
  const fields = await getEffectiveFields(resource);
  const params = [];
  const clauses = searchConditions(resource, { search, filters }, params, fields);
  if (view === "active") clauses.push("deleted_at IS NULL");
  else if (view === "deleted") clauses.push("deleted_at IS NOT NULL");

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(
    `SELECT ${columnList(fields)} FROM ${resource.table} ${where} ORDER BY ${resource.defaultSort} ASC`,
    params,
  );
  return { fields, rows };
}

/** Validate and insert many rows at once (admin bulk import). */
export async function importRecords(resource, rows, actor) {
  if (!Array.isArray(rows) || rows.length === 0) throw badRequest("Import body must be a non-empty array");
  if (rows.length > 1000) throw badRequest("Import is limited to 1000 rows at a time");

  const fields = await getEffectiveFields(resource);
  const map = indexByName(fields);
  const summary = { inserted: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      const values = {};
      for (const key of Object.keys(rows[i])) {
        if (map[key]) values[key] = coerce(map[key], rows[i][key]);
      }
      for (const key of resource.primaryKey) {
        if (values[key] === undefined || values[key] === null) throw new Error(`Missing primary key: ${key}`);
      }
      const created = await insertRow(resource, values, fields);
      await recordAudit({ actor, action: "CREATE", table: resource.table, recordId: recordIdOf(resource, created), after: created });
      summary.inserted++;
    } catch (error) {
      summary.failed++;
      summary.errors.push({ row: i + 1, message: error.message });
    }
  }
  return summary;
}

/** Full-text search (only for resources flagged with `fullText`, e.g. sites). */
export async function fullTextSearch(resource, searchQuery, limit) {
  if (!resource.fullText) throw badRequest("Full-text search is not available for this resource");
  if (!searchQuery?.trim()) return { data: [] };

  const fields = await getEffectiveFields(resource);
  const rows = await query(
    `SELECT ${columnList(fields)},
            ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank,
            ts_headline('english', coalesce(${resource.fullText.headline}, ''), plainto_tsquery('english', $1),
                        'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=25, MinWords=5') AS highlight
       FROM ${resource.table}
      WHERE search_vector @@ plainto_tsquery('english', $1) AND deleted_at IS NULL
      ORDER BY rank DESC
      LIMIT $2`,
    [searchQuery.trim(), limit],
  );
  return { data: rows };
}

/** Reverse a past change and log the reversal as a new REVERT audit entry. */
export async function revertChange(resource, log, actor) {
  if (!["CREATE", "UPDATE", "DELETE"].includes(log.action)) {
    throw badRequest("Only create, update and delete changes can be reverted");
  }
  const fields = await getEffectiveFields(resource);
  const idFrom = (snapshot) => Object.fromEntries(resource.primaryKey.map((key) => [key, snapshot[key]]));

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
  const restored = await updateRow(resource, idValues, pickColumns(fields, log.before_data, { includeId: false }), fields);
  await recordAudit({ actor, action: "REVERT", table: resource.table, recordId: log.record_id, before: current, after: restored });
  return { reverted: "UPDATE", restored };
}
