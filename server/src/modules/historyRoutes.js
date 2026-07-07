import { Router } from "express";
import { query, queryOne } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getResourceByTable } from "./resources.js";
import { revertChange } from "./resourceService.js";
import { badRequest, notFound } from "../utils/errors.js";

const router = Router();

// Change-history feed — visible to every signed-in user (read-only for USER).
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));

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
    const dataParams = [...params, limit, (page - 1) * limit];
    const data = await query(
      `SELECT * FROM audit_log ${where}
       ORDER BY created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({ data, total: totalRow.count, page, limit, totalPages: Math.max(1, Math.ceil(totalRow.count / limit)) });
  } catch (e) {
    next(e);
  }
});

// Schema change log — "the schema changed on <date>" for the information page.
router.get("/schema-changes", requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: await query("SELECT * FROM schema_change_log ORDER BY applied_at DESC") });
  } catch (e) {
    next(e);
  }
});

// Revert a change — admin only. Always appends a new REVERT entry (immutable log).
router.post("/:id/revert", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const log = await queryOne("SELECT * FROM audit_log WHERE id = $1", [Number(req.params.id)]);
    if (!log) throw notFound("Audit entry not found");
    const resource = getResourceByTable(log.table_name);
    if (!resource) throw badRequest("Cannot revert: unknown table");
    res.json({ ok: true, result: await revertChange(resource, log, req.user) });
  } catch (e) {
    next(e);
  }
});

export default router;
