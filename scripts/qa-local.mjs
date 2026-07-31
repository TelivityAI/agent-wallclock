#!/usr/bin/env node
/**
 * Local QA aggregator: unit tests, smoke scripts, and leak scan.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function run(label, cmd, args) {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("test", "npm", ["test"]);
run("smoke", "npm", ["run", "smoke"]);
run("leak-grep", process.execPath, [
  fileURLToPath(new URL("./leak-grep.mjs", import.meta.url)),
]);

console.log("\nqa:local OK");
