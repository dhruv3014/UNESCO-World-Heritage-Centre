import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { pool } from "./config/database.js";
import { ensureDatabase } from "./db/bootstrap.js";

async function start() {
  if (config.database.initOnStart) {
    try {
      await ensureDatabase();
    } catch (error) {
      console.error("Database bootstrap failed:", error);
      process.exit(1);
    }
  }

  const app = createApp();

  // Bind to 0.0.0.0 so hosting platforms (Render, etc.) can reach the server.
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`WHC API listening on port ${config.port} (${config.env})`);
  });

  /** Close the DB pool and HTTP server cleanly on shutdown. */
  async function shutdown() {
    await pool.end();
    server.close(() => process.exit(0));
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
