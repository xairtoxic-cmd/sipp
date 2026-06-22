// One-time: applies supabase/schema.sql to the database.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const sql = fs.readFileSync(path.join(process.cwd(), "supabase", "schema.sql"), "utf8");

const cfg = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
};

const client = new pg.Client(cfg);
try {
  await client.connect();
  await client.query(sql);
  console.log("SCHEMA_OK");
} catch (e) {
  console.error("SCHEMA_FAIL:", e.message);
  process.exit(2);
} finally {
  await client.end().catch(() => {});
}
