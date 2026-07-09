import pg from "pg";
import { env } from "./env.js";

// A single shared connection pool for the whole app.
export const pool = new pg.Pool({ 
  connectionString: env.databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Small helper so callers can write `const rows = await query(sql, params)`.
export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

// Returns the first row or null — handy for "find one" lookups.
export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}
