import fs from "node:fs";
import path from "node:path";

import pg from "pg";

import { loadLocalEnv, requireEnv } from "./_env.mjs";

loadLocalEnv();
if (
  !process.env.SUPABASE_MIGRATION_DB_URL &&
  !process.env.SUPABASE_DB_URL
) {
  requireEnv(["SUPABASE_DB_URL"]);
}

const databaseUrl =
  process.env.SUPABASE_MIGRATION_DB_URL ?? process.env.SUPABASE_DB_URL;
const mode = process.argv[2] ?? "all";
const root = process.cwd();
const files =
  mode === "schema"
    ? ["supabase/schema.sql"]
    : mode === "seed"
      ? ["supabase/seed.sql"]
      : ["supabase/schema.sql", "supabase/seed.sql"];

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  await client.connect();

  for (const relativeFile of files) {
    const file = path.join(root, relativeFile);
    const sql = fs.readFileSync(file, "utf8");

    console.log(`Applying ${relativeFile}...`);
    await client.query(sql);
  }

  console.log(`Applied ${mode} SQL to Supabase.`);
} finally {
  await client.end().catch(() => {});
}
