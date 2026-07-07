// Creates all tables by running schema.sql. Usage: npm run db:init
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "../src/config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = await readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Schema created (all tables ready).");
  await pool.end();
}

main().catch((err) => {
  console.error("Failed to initialize schema:", err);
  process.exit(1);
});
