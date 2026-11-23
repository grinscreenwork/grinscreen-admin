import pg from "pg";
import { createClient } from "@supabase/supabase-js";

for (const name of ["DIRECT_URL", "SESSION_URL", "TRANSACTION_URL"]) {
  const c = new pg.Client({ connectionString: process.env[name], ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const t = await c.query("select table_name from information_schema.tables where table_schema='public' order by 1");
    console.log(name, "OK. public tables:", t.rows.map((r) => r.table_name).join(", ") || "(none)");
    await c.end();
  } catch (e) {
    console.log(name, "error:", e.code, e.message.replace(/postgres(ql)?:\/\/\S+/g, "<url>"));
  }
}
for (const keyName of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]) {
  const sb = createClient(process.env.SUPABASE_URL, process.env[keyName]);
  const { data, error } = await sb.storage.listBuckets();
  console.log(keyName, "->", error ? "ERR " + error.message : data.map((b) => `${b.name}(public=${b.public},limit=${b.file_size_limit})`).join(", "));
}
