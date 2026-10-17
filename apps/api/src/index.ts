import { serve } from "@hono/node-server";
import type { Server } from "node:http";
import { config } from "./env.js";
import { migrate } from "./migrate.js";
import { createApp } from "./app.js";
import { startDeckWorker } from "./queue.js";
import { attachDeckWebSocket } from "./deck-ws-server.js";

async function main() {
  if (config.databaseUrl) {
    await migrate();
  }
  startDeckWorker();
  const app = createApp();
  const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`api on ${info.port}`);
  }) as Server;
  attachDeckWebSocket(server);
  console.log(`deck ws on /ws/deck/:id`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
