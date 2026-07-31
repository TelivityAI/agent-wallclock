import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const bin = join(root, "packages/cli/dist/bin.js");
const home = mkdtempSync(join(tmpdir(), "wallclock-smoke-"));

function run(args, { expectFail = false } = {}) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    env: { ...process.env, AGENT_WALLCLOCK_HOME: home },
  });
  if (expectFail) {
    if (result.status === 0) {
      throw new Error(`expected failure for wallclock ${args.join(" ")}`);
    }
    return result.stderr || result.stdout;
  }
  if (result.status !== 0) {
    throw new Error(
      `wallclock ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

try {
  run(["init"]);
  run(["effort", "start", "Auth", "Rewrite"]);
  const again = run(["effort", "start", "auth-rewrite"]);
  if (!again.includes("Using existing")) {
    throw new Error("expected slug match for Auth Rewrite / auth-rewrite");
  }
  run(["effort", "log", "auth", "rewrite", "30m"]);
  run(["session", "start"]);
  const brief = run(["brief"]);
  if (!brief.includes("Temporal Briefing")) {
    throw new Error("brief missing title");
  }
  if (!brief.includes("auth-rewrite")) {
    throw new Error("brief missing active effort");
  }
  if (!brief.includes("Generated at:")) {
    throw new Error("brief missing freshness");
  }
  const cfg = run(["mcp-config", "--print", "cursor"]);
  if (!cfg.includes("mcpServers") || !cfg.includes("server.js")) {
    throw new Error("mcp-config missing server path");
  }
  run(["session", "end"]);
  run(["timeline"]);
  run(["now"]);
  console.log("CLI smoke OK");
} finally {
  rmSync(home, { recursive: true, force: true });
}
