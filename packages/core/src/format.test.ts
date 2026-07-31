import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDuration } from "./format.js";
import { parseDuration } from "./duration.js";
import { slugifyEffortName, editDistance } from "./effort.js";

describe("formatDuration", () => {
  it("returns unknown for missing values", () => {
    assert.equal(formatDuration(null), "unknown");
    assert.equal(formatDuration(undefined), "unknown");
    assert.equal(formatDuration(Number.NaN), "unknown");
    assert.equal(formatDuration(-1), "unknown");
  });

  it("formats edge boundaries", () => {
    assert.equal(formatDuration(0), "0s");
    assert.equal(formatDuration(999), "0s");
    assert.equal(formatDuration(1000), "1s");
    assert.equal(formatDuration(59_000), "59s");
    assert.equal(formatDuration(60_000), "1m");
    assert.equal(formatDuration(61_000), "1m 1s");
    assert.equal(formatDuration(9 * 60_000 + 59_000), "9m 59s");
    assert.equal(formatDuration(10 * 60_000), "10m");
    assert.equal(formatDuration(10 * 60_000 + 30_000), "10m");
    assert.equal(formatDuration(3_661_000), "1h 1m");
    assert.equal(formatDuration(86_400_000), "1d");
    assert.equal(formatDuration(90_000_000), "1d 1h");
    assert.equal(formatDuration(14 * 86_400_000), "14d");
  });

  it("keeps day-only units (no weeks)", () => {
    assert.equal(formatDuration(7 * 86_400_000), "7d");
    assert.ok(!formatDuration(14 * 86_400_000).includes("w"));
  });

  it("shows seconds under 10 minutes", () => {
    assert.equal(formatDuration(5_000), "5s");
    assert.equal(formatDuration(5 * 60_000 + 30_000), "5m 30s");
  });
});

describe("parseDuration", () => {
  it("parses common tokens", () => {
    assert.equal(parseDuration("30m"), 30 * 60_000);
    assert.equal(parseDuration("2h"), 2 * 3_600_000);
    assert.equal(parseDuration("90s"), 90_000);
    assert.equal(parseDuration("1d"), 86_400_000);
    assert.equal(parseDuration("500ms"), 500);
  });

  it("rejects invalid input", () => {
    assert.throws(() => parseDuration("abc"), /Invalid duration/);
  });
});

describe("slugifyEffortName", () => {
  it("collapses spaced and hyphenated names", () => {
    assert.equal(slugifyEffortName("Auth Rewrite"), "auth-rewrite");
    assert.equal(slugifyEffortName("auth-rewrite"), "auth-rewrite");
    assert.equal(slugifyEffortName("  AUTH  rewrite  "), "auth-rewrite");
  });
});

describe("editDistance", () => {
  it("measures near duplicates", () => {
    assert.equal(editDistance("auth-rewrite", "auth-rewrte"), 1);
    assert.equal(editDistance("abc", "abc"), 0);
  });
});
