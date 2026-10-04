import { serve } from "@hono/node-server";
import { config } from "./env.js";
import { migrate } from "./migrate.js";
import { createApp } from "./app.js";
import { startDeckWorker } from "./queue.js";

async function main() {
  if (config.databaseUrl) {
    await migrate();
  }
  startDeckWorker();
  const app = createApp();
  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`api on ${info.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
