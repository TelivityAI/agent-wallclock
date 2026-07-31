import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDuration } from "./format.js";

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
