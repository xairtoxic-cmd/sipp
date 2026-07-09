// Probe pooler hosts/ports until one authenticates, then report it.
// Run: SUPA_PW=... node scripts/find-pooler.mjs
import pg from "pg";

const PW = process.env.SUPA_PW;
const hosts = [];
for (const p of ["aws-0", "aws-1"]) for (const r of ["ap-northeast-1", "ap-southeast-1", "us-east-1", "eu-central-1"]) hosts.push(`${p}-${r}.pooler.supabase.com`);

for (const host of hosts) {
  for (const port of [5432, 6543]) {
    const c = new pg.Client({ host, port, user: "postgres.viektinnderxgfddmnhn", password: PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 });
    try {
      await c.connect();
      const { rows } = await c.query("select 1 as ok");
      await c.end();
      console.log(`WORKS: ${host}:${port} (${rows[0].ok})`);
      process.exit(0);
    } catch (e) {
      console.log(`no: ${host}:${port} — ${e.message.slice(0, 60)}`);
      try { await c.end(); } catch {}
    }
  }
}
console.log("NONE WORKED");
