import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const REF = process.env.SUPA_REF;
const PW = process.env.SUPA_PW;
const sql = fs.readFileSync(path.join(process.cwd(), "supabase", "schema.sql"), "utf8");

const regions = [
  "me-central-1", "eu-central-1", "eu-central-2", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
  "us-east-1", "us-east-2", "us-west-1", "us-west-2", "sa-east-1", "ca-central-1", "af-south-1",
];
const prefixes = ["aws-0", "aws-1"];

const hosts = [];
for (const r of regions) for (const p of prefixes) hosts.push(`${p}-${r}.pooler.supabase.com`);

for (const host of hosts) {
  const client = new pg.Client({
    host,
    port: 5432,
    user: `postgres.${REF}`,
    password: PW,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    await client.query(sql);
    console.log("SCHEMA_OK host=" + host);
    await client.end().catch(() => {});
    process.exit(0);
  } catch (e) {
    await client.end().catch(() => {});
    // Only log the interesting (non-tenant-mismatch) errors.
    if (!/Tenant or user not found|password authentication|ENOTFOUND|getaddrinfo/i.test(e.message)) {
      console.error(host + " -> " + e.message);
    }
  }
}
console.error("NO_HOST_FOUND");
process.exit(2);
