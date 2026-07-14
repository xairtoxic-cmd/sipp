// Print SQL results: node scripts/query.mjs "select ..."
import pg from "pg";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const client = new pg.Client({ host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432, user: "postgres.viektinnderxgfddmnhn", password: env.SUPA_PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await client.connect();
for (const sql of process.argv.slice(2)) {
  const { rows } = await client.query(sql);
  console.log(JSON.stringify(rows, null, 1));
}
await client.end();
