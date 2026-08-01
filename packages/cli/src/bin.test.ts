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

  it("circadian defaults off and opt-in adds briefing block", () => {
    home = mkdtempSync(join(tmpdir(), "wallclock-cli-test-"));
    assert.equal(run(["init"]).status, 0);

    const statusOff = run(["circadian", "status"]);
    assert.equal(statusOff.status, 0, statusOff.stderr || statusOff.stdout);
    assert.match(statusOff.stdout, /circadian: off/);

    const briefOff = run(["brief"]);
    assert.equal(briefOff.status, 0, briefOff.stderr || briefOff.stdout);
    assert.doesNotMatch(briefOff.stdout, /## Circadian/);

    const on = run(["circadian", "on"]);
    assert.equal(on.status, 0, on.stderr || on.stdout);
    assert.match(on.stdout, /circadian: on/);

    const statusOn = run(["circadian", "status"]);
    assert.equal(statusOn.status, 0, statusOn.stderr || statusOn.stdout);
    assert.match(statusOn.stdout, /circadian: on/);
    assert.match(statusOn.stdout, /band: /);
    assert.match(statusOn.stdout, /day: /);

    const briefOn = run(["brief"]);
    assert.equal(briefOn.status, 0, briefOn.stderr || briefOn.stdout);
    assert.match(briefOn.stdout, /## Circadian/);
    assert.match(briefOn.stdout, /Band: /);
    assert.match(briefOn.stdout, /Day: /);
    assert.match(briefOn.stdout, /Tone: /);

    const json = run(["brief", "--json"]);
    assert.equal(json.status, 0, json.stderr || json.stdout);
    const parsed = JSON.parse(json.stdout) as { circadian: { band: string } | null };
    assert.ok(parsed.circadian);
    assert.ok(parsed.circadian?.band);

    const compact = run(["brief", "--compact"]);
    assert.equal(compact.status, 0, compact.stderr || compact.stdout);
    assert.match(compact.stdout, /circadian \w+ \w+/);

    assert.equal(run(["circadian", "off"]).status, 0);
    const briefAgain = run(["brief"]);
    assert.doesNotMatch(briefAgain.stdout, /## Circadian/);
  });
});
