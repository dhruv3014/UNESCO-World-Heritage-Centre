import pg from "pg";
import { config } from "./env.js";

/**
 * A single shared connection pool for the whole API.
 *
 * `ssl.rejectUnauthorized: false` is required by managed providers such as
 * Neon, which present certificates that aren't in Node's default trust store.
 */
export const pool = new pg.Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
});

/** Run a query and return the rows. */
export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

/** Run a query and return the first row, or `null` if there are none. */
export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}
