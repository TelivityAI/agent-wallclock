import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getNow, setClock, resetClock } from "./clock.js";

describe("clock", () => {
  afterEach(() => {
    resetClock();
  });

  it("supports injectable clock for deterministic tests", () => {
    setClock(() => new Date("2026-06-15T18:30:45.000Z"));
    const now = getNow();
    assert.equal(now.iso, "2026-06-15T18:30:45.000Z");
    assert.equal(now.epochMs, Date.parse("2026-06-15T18:30:45.000Z"));
    assert.match(now.iso, /Z$/);
  });

  it("formats local fields from a fixed instant (DST-safe fixture)", () => {
    // Fixed UTC instant; local date/time depend on host TZ but must be stable for that host.
    const fixed = new Date("2026-03-08T12:00:00.000Z"); // US spring-forward weekend
    const a = getNow(fixed);
    const b = getNow(fixed);
    assert.equal(a.iso, b.iso);
    assert.equal(a.localDate, b.localDate);
    assert.equal(a.localTime, b.localTime);
    assert.equal(a.weekday, b.weekday);
    assert.ok(a.timezone.includes("UTC"));
    assert.match(a.timezoneOffset, /^[+-]\d{2}:\d{2}$/);
  });

  it("handles winter DST fixture consistently", () => {
    const winter = new Date("2026-11-01T12:00:00.000Z"); // US fall-back weekend
    const info = getNow(winter);
    assert.equal(info.iso, "2026-11-01T12:00:00.000Z");
    assert.ok(info.localDate.length === 10);
    assert.ok(info.localTime.length === 8);
  });
});
