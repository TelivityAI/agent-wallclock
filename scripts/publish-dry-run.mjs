#!/usr/bin/env node
/**
 * Dry-run npm publish for publishable workspace packages (no actual publish).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const packages = ["@agent-wallclock/cli", "@agent-wallclock/mcp"];

for (const pkg of packages) {
  console.log(`\n--- npm publish --dry-run -w ${pkg} ---`);
  const result = spawnSync("npm", ["publish", "--dry-run", "-w", pkg], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\npublish dry-run OK");
