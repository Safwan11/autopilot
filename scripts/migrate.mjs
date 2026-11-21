// Applies SQL migrations in ./drizzle to the database. Runs before every build.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.warn("[migrate] No DATABASE_URL set, skipping migrations.");
  process.exit(0);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Database is up to date.");
} catch (e) {
  console.error("[migrate] Failed:", e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
