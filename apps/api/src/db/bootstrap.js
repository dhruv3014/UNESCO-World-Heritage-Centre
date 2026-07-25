import { query } from "../config/database.js";
import { config } from "../config/env.js";
import { run as initDatabase } from "./init.js";
import { run as seedDatabase } from "./seed.js";

/**
 * Ensure the database schema exists before the API starts.
 *
 * This is intentionally conservative: it only runs when the service is started
 * with DATABASE_INIT_ON_START=true, and it only bootstraps an empty database.
 */
export async function ensureDatabase() {
  const result = await query("SELECT to_regclass('public.app_user') AS app_user");
  const hasUsersTable = result[0]?.app_user;

  if (hasUsersTable) {
    return;
  }

  console.log("Database schema not found; creating schema and seed data.");
  await initDatabase(false);
  await seedDatabase(false);
  console.log("Database bootstrap complete.");
}
