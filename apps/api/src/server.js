import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { pool } from "./config/database.js";

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
