import { spawnSync } from "node:child_process";
import path from "node:path";

const prismaCli = path.join(
  process.cwd(),
  "node_modules/prisma/build/index.js",
);
const buildPlaceholder = new URL(
  "postgresql://127.0.0.1:5433/xs_build_placeholder?schema=public",
);
buildPlaceholder.username = "xs_build_placeholder";
buildPlaceholder.password = "xs_build_placeholder";
const databaseUrl = process.env.DATABASE_URL ?? buildPlaceholder.toString();
const directUrl = process.env.DIRECT_URL ?? databaseUrl;

const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: directUrl },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
