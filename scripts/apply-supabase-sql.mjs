import { spawnSync } from "node:child_process";
import path from "node:path";

import { loadLocalEnv, requireEnv } from "./_env.mjs";

loadLocalEnv();
requireEnv(["SUPABASE_DB_URL"]);

const mode = process.argv[2] ?? "all";
const root = process.cwd();
const files =
  mode === "schema"
    ? ["supabase/schema.sql"]
    : mode === "seed"
      ? ["supabase/seed.sql"]
      : ["supabase/schema.sql", "supabase/seed.sql"];

for (const relativeFile of files) {
  const file = path.join(root, relativeFile);
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "supabase@latest",
      "db",
      "query",
      "--db-url",
      process.env.SUPABASE_DB_URL,
      "--file",
      file,
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Applied ${mode} SQL to Supabase.`);
