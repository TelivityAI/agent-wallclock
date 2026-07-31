import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDuration } from "./format.js";
import { parseDuration } from "./duration.js";
import { slugifyEffortName } from "./effort.js";

describe("formatDuration", () => {
  it("returns unknown for missing values", () => {
    assert.equal(formatDuration(null), "unknown");
    assert.equal(formatDuration(undefined), "unknown");
    assert.equal(formatDuration(Number.NaN), "unknown");
  });

  it("formats short and multi-unit durations", () => {
    assert.equal(formatDuration(5000), "5s");
    assert.equal(formatDuration(65_000), "1m");
    assert.equal(formatDuration(3_661_000), "1h 1m");
    assert.equal(formatDuration(90_000_000), "1d 1h");
  });
});

describe("parseDuration", () => {
  it("parses common tokens", () => {
    assert.equal(parseDuration("30m"), 30 * 60_000);
    assert.equal(parseDuration("2h"), 2 * 3_600_000);
    assert.equal(parseDuration("90s"), 90_000);
    assert.equal(parseDuration("1d"), 86_400_000);
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
