import pg from "pg";
import { config } from "./env.js";
import { SCHEMA_SQL } from "./schema.js";

export const pool = config.databaseUrl
  ? new pg.Pool({ connectionString: config.databaseUrl })
  : null;

export async function migrate(): Promise<void> {
  if (!pool) throw new Error("DATABASE_URL is not set");
  await pool.query(SCHEMA_SQL);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      console.log("migrated");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
