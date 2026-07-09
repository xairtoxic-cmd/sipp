// Apply SQL migration files to the Supabase DB via the IPv4 session pooler.
// Run: SUPA_PW=... node scripts/run-sql.mjs path/to/file.sql [more.sql]
import pg from "pg";
import fs from "fs";

const PW = process.env.SUPA_PW;
if (!PW) { console.error("Need SUPA_PW"); process.exit(1); }
const files = process.argv.slice(2);
if (!files.length) { console.error("Pass at least one .sql file"); process.exit(1); }

const client = new pg.Client({
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.viektinnderxgfddmnhn",
  password: PW,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();
for (const f of files) {
  const sql = fs.readFileSync(f, "utf8");
  await client.query(sql);
  console.log("APPLIED:", f);
}
await client.end();
