import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyStore } from "./store.js";
import { startEffort, effortStatus } from "./effort.js";
import { startSession, endSession } from "./session.js";
import { buildBriefingInput, renderBriefing } from "./brief.js";

describe("effort and session", () => {
  it("accumulates session duration into effort total", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T10:00:00.000Z");
    const t1 = new Date("2026-03-01T10:30:00.000Z");

    ({ store } = startEffort(store, "docs-pass", t0));
    ({ store } = startSession(store, undefined, t0));
    const ended = endSession(store, t1);
    store = ended.store;

    assert.equal(ended.durationMs, 30 * 60 * 1000);
    assert.equal(store.efforts[0]?.totalMs, 30 * 60 * 1000);
    assert.equal(store.activeSessionId, null);

    const status = effortStatus(store, "docs-pass", t1);
    assert.equal(status.totalMs, 30 * 60 * 1000);
    assert.ok(status.ageMs != null && status.ageMs >= 30 * 60 * 1000);
  });

  it("briefing marks missing session as unknown and includes model rules", () => {
    const store = emptyStore();
    const input = buildBriefingInput(store, new Date("2026-03-01T09:30:00.000Z"));
    assert.equal(input.activeSession, null);
    assert.equal(input.sessionAgeMs, null);

    const text = renderBriefing(store, new Date("2026-03-01T09:30:00.000Z"));
    assert.match(text, /Local time: /);
    assert.match(text, /Age: unknown/);
    assert.match(text, /Never invent time of day/);
    assert.match(text, /09:30:00/);
  });
});
