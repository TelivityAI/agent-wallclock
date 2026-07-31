import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const bin = join(root, "packages", "cli", "dist", "bin.js");
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
  const briefJson = run(["brief", "--json"]);
  const parsed = JSON.parse(briefJson);
  if (!parsed.generatedAt || !parsed.now) {
    throw new Error("brief --json missing expected fields");
  }
  const version = run(["--version"]).trim();
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    throw new Error(`unexpected --version output: ${version}`);
  }
  const where = run(["where"]);
  if (!where.includes("store_dir:") || !where.includes("mcp_server:")) {
    throw new Error("where missing expected paths");
  }
  const doctor = run(["doctor"]);
  if (!doctor.includes("Doctor OK")) {
    throw new Error("doctor did not pass");
  }
  const sessionStatus = run(["session", "status"]);
  if (!sessionStatus.includes("Status:") || !sessionStatus.includes("open")) {
    throw new Error("session status missing open session");
  }
  run(["effort", "start", "docs"]);
  const effortList = run(["effort", "list", "--json"]);
  const efforts = JSON.parse(effortList);
  if (!Array.isArray(efforts) || efforts.length < 2) {
    throw new Error("effort list --json expected multiple efforts");
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
