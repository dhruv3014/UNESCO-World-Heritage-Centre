import { query, queryOne } from "../../config/database.js";
import { badRequest } from "../../utils/http-errors.js";

/** GET /api/watch — records the current user is watching. */
export async function listWatches(req, res) {
  const data = await query(
    "SELECT table_name, record_id FROM watch WHERE user_id = $1 ORDER BY created_at DESC",
    [req.user.sub],
  );
  res.json({ data });
}

/** POST /api/watch — start watching a record. Body: { table, recordId }. */
export async function addWatch(req, res) {
  const { table, recordId } = req.body ?? {};
  if (!table || recordId === undefined) throw badRequest("table and recordId are required");
  await query(
    `INSERT INTO watch (user_id, table_name, record_id) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, table_name, record_id) DO NOTHING`,
    [req.user.sub, table, String(recordId)],
  );
  res.status(201).json({ ok: true });
}

/** DELETE /api/watch?table=&recordId= — stop watching a record. */
export async function removeWatch(req, res) {
  const { table, recordId } = req.query;
  if (!table || recordId === undefined) throw badRequest("table and recordId are required");
  await query("DELETE FROM watch WHERE user_id = $1 AND table_name = $2 AND record_id = $3", [
    req.user.sub,
    table,
    String(recordId),
  ]);
  res.json({ ok: true });
}

/** GET /api/feed — changes to any record the user is watching, newest first. */
export async function listFeed(req, res) {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 25)));

  const totalRow = await queryOne(
    `SELECT COUNT(*)::int AS count FROM audit_log a
       JOIN watch w ON w.table_name = a.table_name AND w.record_id = a.record_id
      WHERE w.user_id = $1`,
    [req.user.sub],
  );
  const data = await query(
    `SELECT a.* FROM audit_log a
       JOIN watch w ON w.table_name = a.table_name AND w.record_id = a.record_id
      WHERE w.user_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3`,
    [req.user.sub, limit, (page - 1) * limit],
  );

  res.json({ data, total: totalRow.count, page, limit, totalPages: Math.max(1, Math.ceil(totalRow.count / limit)) });
}
