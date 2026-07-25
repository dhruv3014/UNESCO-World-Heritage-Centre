import { query, queryOne } from "../../config/database.js";
import { getResourceByTable } from "../resources/resource.registry.js";
import { revertChange } from "../resources/resource.service.js";
import { badRequest, notFound } from "../../utils/http-errors.js";

/** GET /api/history — change-history feed, filterable by table and action. */
export async function listHistory(req, res) {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)));

  const params = [];
  const clauses = [];
  if (req.query.table) {
    params.push(req.query.table);
    clauses.push(`table_name = $${params.length}`);
  }
  if (req.query.action) {
    params.push(req.query.action);
    clauses.push(`action = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const totalRow = await queryOne(`SELECT COUNT(*)::int AS count FROM audit_log ${where}`, params);
  const pageParams = [...params, limit, (page - 1) * limit];
  const data = await query(
    `SELECT * FROM audit_log ${where}
     ORDER BY created_at DESC
     LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams,
  );

  res.json({ data, total: totalRow.count, page, limit, totalPages: Math.max(1, Math.ceil(totalRow.count / limit)) });
}

/** GET /api/history/schema-changes — the schema change log. */
export async function listSchemaChanges(_req, res) {
  res.json({ data: await query("SELECT * FROM schema_change_log ORDER BY applied_at DESC") });
}

/** POST /api/history/:id/revert — reverse a change (admin only). */
export async function revert(req, res) {
  const log = await queryOne("SELECT * FROM audit_log WHERE id = $1", [Number(req.params.id)]);
  if (!log) throw notFound("Audit entry not found");
  const resource = getResourceByTable(log.table_name);
  if (!resource) throw badRequest("Cannot revert: unknown table");
  res.json({ ok: true, result: await revertChange(resource, log, req.user) });
}
