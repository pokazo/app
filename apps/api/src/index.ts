import { serve } from "@hono/node-server";
import type { Server } from "node:http";
import { config } from "./env.js";
import { migrate } from "./migrate.js";
import { createApp } from "./app.js";
import { startDeckWorker } from "./queue.js";
import { attachDeckWebSocket, tryHandleDeckWsUpgrade } from "./deck-ws-server.js";
import { tryHandleSlidevDevUpgrade } from "./slidev-dev-proxy.js";
import { slidevDevPoolEnabled, sweepSlidevDevIdle } from "./slidev-dev-pool.js";

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
  server.on("upgrade", (req, socket, head) => {
    // Hijacked upgrade sockets are no longer covered by the HTTP server.
    // An unhandled ECONNRESET here exits the process and nginx returns 502.
    socket.on("error", () => {});
    if (tryHandleSlidevDevUpgrade(req, socket, head)) return;
    if (tryHandleDeckWsUpgrade(req, socket, head)) return;
    socket.destroy();
  });
  console.log(`deck ws on /ws/deck/:id`);
  if (slidevDevPoolEnabled()) {
    console.log(
      `slidev-dev pool max=${config.slidevDevPoolMax} idleMs=${config.slidevDevPoolIdleMs}`,
    );
    setInterval(() => {
      void sweepSlidevDevIdle().then((n) => {
        if (n > 0) console.info(`[slidev-dev] swept idle=${n}`);
      });
    }, 60_000).unref?.();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
