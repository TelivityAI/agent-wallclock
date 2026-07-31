#!/usr/bin/env node
/**
 * Scan tracked files for accidental secret or personal-path leaks.
 * Skips workflow YAML and this script (they document match patterns).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SKIP_FILES = new Set([
  ".github/workflows/ci.yml",
  "scripts/leak-grep.mjs",
]);

const PATTERNS = [
  { id: "home-path", re: /\/Users\/[A-Za-z0-9._-]+\// },
  { id: "openai-key", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { id: "github-token", re: /\bghp_[A-Za-z0-9]{20,}\b/ },
  { id: "slack-token", re: /\bxoxb-[A-Za-z0-9-]{20,}\b/ },
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

function trackedFiles() {
  const out = execSync("git ls-files -z", { encoding: "buffer" });
  return out
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((f) => !SKIP_FILES.has(f));
}

const hits = [];

for (const file of trackedFiles()) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { id, re } of PATTERNS) {
      if (re.test(line)) {
        hits.push({ file, line: i + 1, pattern: id, snippet: line.trim().slice(0, 120) });
      }
    }
  }
}

if (hits.length > 0) {
  console.error("leak-grep: possible secrets or personal paths in tracked files:\n");
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line} [${h.pattern}] ${h.snippet}`);
  }
  process.exit(1);
}

console.log("leak-grep OK");
