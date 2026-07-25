import { query } from "../../config/database.js";

/** Compare two record snapshots and return only the fields that changed. */
export function computeDiff(before, after) {
  const diff = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of keys) {
    const from = before?.[key];
    const to = after?.[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diff[key] = { from: from ?? null, to: to ?? null };
    }
  }
  return diff;
}

/** Write one immutable entry to the audit log for a data change. */
export async function recordAudit({ actor, action, table, recordId, before, after }) {
  const diff = before && after ? computeDiff(before, after) : null;
  await query(
    `INSERT INTO audit_log (actor_id, actor_email, action, table_name, record_id, before_data, after_data, diff)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      actor?.sub ?? null,
      actor?.email ?? null,
      action,
      table,
      recordId,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      diff ? JSON.stringify(diff) : null,
    ],
  );
}
