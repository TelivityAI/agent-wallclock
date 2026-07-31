import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it, afterEach } from "node:test";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));

let home = "";

function run(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    env: { ...process.env, AGENT_WALLCLOCK_HOME: home, ...env },
  });
}

describe("wallclock CLI", () => {
  afterEach(() => {
    if (home) {
      rmSync(home, { recursive: true, force: true });
      home = "";
    }
  });

  it("isolates store via AGENT_WALLCLOCK_HOME", () => {
    home = mkdtempSync(join(tmpdir(), "wallclock-cli-test-"));
    const init = run(["init"]);
    assert.equal(init.status, 0, init.stderr || init.stdout);
    const where = run(["where"]);
    assert.equal(where.status, 0, where.stderr || where.stdout);
    assert.ok(where.stdout.includes(home), "where should report isolated home");
  });

  it("logs multi-word effort durations", () => {
    home = mkdtempSync(join(tmpdir(), "wallclock-cli-test-"));
    assert.equal(run(["init"]).status, 0);
    assert.equal(run(["effort", "start", "auth rewrite"]).status, 0);
    const log = run(["effort", "log", "auth", "rewrite", "45m"]);
    assert.equal(log.status, 0, log.stderr || log.stdout);
    assert.match(log.stdout, /Logged .* on "auth-rewrite"/);
  });

  it("returns nonzero exit for unknown commands", () => {
    home = mkdtempSync(join(tmpdir(), "wallclock-cli-test-"));
    assert.equal(run(["init"]).status, 0);
    const bad = run(["not-a-command"]);
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr || bad.stdout, /Unknown command/);
  });

  it("uses stable exit codes for usage errors", () => {
    home = mkdtempSync(join(tmpdir(), "wallclock-cli-test-"));
    assert.equal(run(["init"]).status, 0);
    const usage = run(["effort", "log"]);
    assert.equal(usage.status, 2, usage.stderr || usage.stdout);
  });
});
