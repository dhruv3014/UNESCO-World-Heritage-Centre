/**
 * Initialises the database by running schema.sql.
 *
 *   npm run db:init
 *
 * WARNING: schema.sql drops and recreates every table, so this wipes existing
 * data. Run it once when setting up a new database (local or Neon).
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "../config/database.js";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = await readFile(path.join(here, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("✓ Database schema created (all tables ready).");
  await pool.end();
}

main().catch((error) => {
  console.error("✗ Failed to initialise the database:", error);
  process.exit(1);
});
