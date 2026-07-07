import { query, queryOne } from "../config/db.js";
import { recordAudit } from "./audit.js";
import { badRequest, notFound } from "../utils/errors.js";

// --- helpers ---------------------------------------------------------------

function fieldsByName(resource) {
  return Object.fromEntries(resource.fields.map((f) => [f.name, f]));
}

// Convert an incoming value into the correct JS type for its column.
function coerce(field, value) {
  if (value === "" || value === null || value === undefined) return null;
  if (field.type === "number") {
    const n = Number(value);
    if (Number.isNaN(n)) throw badRequest(`Invalid number for ${field.name}`);
    return n;
  }
  if (field.type === "boolean") return value === true || value === "true";
  return value; // strings and dates are passed through (pg parses date strings)
}

// Join primary-key values into a stable string id for the audit log.
function recordIdOf(resource, row) {
  return resource.pk.map((k) => row[k]).join(":");
}

// --- low-level SQL builders (no auditing) ----------------------------------

async function insertRow(resource, values) {
  const columns = Object.keys(values);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  return queryOne(
    `INSERT INTO ${resource.table} (${columns.join(", ")})
     VALUES (${placeholders.join(", ")}) RETURNING *`,
    Object.values(values)
  );
}

async function updateRowByPk(resource, idValues, values) {
  const params = [];
  const setClauses = Object.entries(values).map(([col, val]) => {
    params.push(val);
    return `${col} = $${params.length}`;
  });
  if (setClauses.length === 0) return getRecord(resource, idValues);
  const where = pkWhere(resource, idValues, params);
  return queryOne(`UPDATE ${resource.table} SET ${setClauses.join(", ")} ${where} RETURNING *`, params);
}

async function deleteRowByPk(resource, idValues) {
  const params = [];
  const where = pkWhere(resource, idValues, params);
  await query(`DELETE FROM ${resource.table} ${where}`, params);
}

// Build "WHERE pk1 = $x AND pk2 = $y", appending to the given params array.
function pkWhere(resource, idValues, params) {
  const byName = fieldsByName(resource);
  const clauses = resource.pk.map((key) => {
    params.push(coerce(byName[key], idValues[key]));
    return `${key} = $${params.length}`;
  });
  return `WHERE ${clauses.join(" AND ")}`;
}

// Build the search + filters WHERE clause, appending to the params array.
function searchWhere(resource, { search, filters }, params) {
  const byName = fieldsByName(resource);
  const clauses = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    const searchable = resource.fields.filter((f) => f.searchable);
    if (searchable.length) {
      const ors = searchable.map((f) => {
        params.push(term);
        return `${f.name} ILIKE $${params.length}`;
      });
      clauses.push(`(${ors.join(" OR ")})`);
    }
  }

  for (const cond of filters || []) {
    const field = byName[cond.field];
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

  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

// Pick only known columns from an object (used for create/revert snapshots).
function pickColumns(resource, source, { includeId }) {
  const byName = fieldsByName(resource);
  const out = {};
  for (const key of Object.keys(source)) {
    const field = byName[key];
    if (!field) continue;
    if (!includeId && field.isId) continue;
    out[key] = source[key];
  }
  return out;
}

// --- public API ------------------------------------------------------------

export async function listRecords(resource, { page, limit, sort, order, search, filters }) {
  const params = [];
  const where = searchWhere(resource, { search, filters }, params);

  const sortColumn = resource.fields.some((f) => f.name === sort) ? sort : resource.defaultSort;
  const sortDir = order === "desc" ? "DESC" : "ASC";

  const totalRow = await queryOne(`SELECT COUNT(*)::int AS count FROM ${resource.table} ${where}`, params);
  const total = totalRow.count;

  const dataParams = [...params, limit, (page - 1) * limit];
  const data = await query(
    `SELECT * FROM ${resource.table} ${where}
     ORDER BY ${sortColumn} ${sortDir}
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getRecord(resource, idValues) {
  const params = [];
  const where = pkWhere(resource, idValues, params);
  const row = await queryOne(`SELECT * FROM ${resource.table} ${where}`, params);
  if (!row) throw notFound(`${resource.label} not found`);
  return row;
}

export async function createRecord(resource, body, actor) {
  const byName = fieldsByName(resource);
  const values = {};
  for (const field of resource.fields) {
    if (field.name in body) values[field.name] = coerce(field, body[field.name]);
  }
  for (const key of resource.pk) {
    if (values[key] === undefined || values[key] === null) throw badRequest(`Missing primary key: ${key}`);
  }
  const created = await insertRow(resource, values);
  await recordAudit({ actor, action: "CREATE", table: resource.table, recordId: recordIdOf(resource, created), after: created });
  return created;
}

export async function updateRecord(resource, idValues, body, actor) {
  const before = await getRecord(resource, idValues);
  const values = {};
  for (const field of resource.fields) {
    if (!field.isId && field.name in body) values[field.name] = coerce(field, body[field.name]);
  }
  const after = await updateRowByPk(resource, idValues, values);
  await recordAudit({ actor, action: "UPDATE", table: resource.table, recordId: recordIdOf(resource, after), before, after });
  return after;
}

export async function deleteRecord(resource, idValues, actor) {
  const before = await getRecord(resource, idValues);
  await deleteRowByPk(resource, idValues);
  await recordAudit({ actor, action: "DELETE", table: resource.table, recordId: recordIdOf(resource, before), before });
  return { deleted: true };
}

// --- revert (used by the history routes) -----------------------------------

// Reverse a past change and log the reversal as a new REVERT audit entry.
export async function revertChange(resource, log, actor) {
  const idFrom = (snapshot) => Object.fromEntries(resource.pk.map((k) => [k, snapshot[k]]));

  if (log.action === "CREATE") {
    await deleteRowByPk(resource, idFrom(log.after_data));
    await recordAudit({ actor, action: "REVERT", table: resource.table, recordId: log.record_id, before: log.after_data });
    return { reverted: "CREATE" };
  }

  if (log.action === "DELETE") {
    const restored = await insertRow(resource, pickColumns(resource, log.before_data, { includeId: true }));
    await recordAudit({ actor, action: "REVERT", table: resource.table, recordId: log.record_id, after: restored });
    return { reverted: "DELETE", restored };
  }

  // UPDATE — restore the "before" snapshot.
  const idValues = idFrom(log.before_data);
  const current = await getRecord(resource, idValues);
  const restored = await updateRowByPk(resource, idValues, pickColumns(resource, log.before_data, { includeId: false }));
  await recordAudit({ actor, action: "REVERT", table: resource.table, recordId: log.record_id, before: current, after: restored });
  return { reverted: "UPDATE", restored };
}
