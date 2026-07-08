import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`UNESCO WHC API listening on http://localhost:${env.port}`);
});

// Close the DB pool cleanly on shutdown.
async function shutdown() {
  await pool.end();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);