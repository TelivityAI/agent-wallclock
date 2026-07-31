import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyStore } from "./store.js";
import { startEffort, effortStatus, findEffort } from "./effort.js";
import { startSession, endSession, timeline } from "./session.js";
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

  it("treats Auth Rewrite and auth-rewrite as the same effort", () => {
    let store = emptyStore();
    ({ store } = startEffort(store, "Auth Rewrite", new Date("2026-03-01T10:00:00.000Z")));
    const again = startEffort(store, "auth-rewrite", new Date("2026-03-01T11:00:00.000Z"));
    assert.equal(again.created, false);
    assert.equal(again.effort.name, "auth-rewrite");
    assert.equal(store.efforts.length, 1);
    assert.ok(findEffort(again.store, "AUTH rewrite"));
  });

  it("includes open session age in effort status total", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T10:00:00.000Z");
    const t1 = new Date("2026-03-01T10:12:00.000Z");
    ({ store } = startEffort(store, "auth-rewrite", t0));
    ({ store } = startSession(store, undefined, t0));
    const status = effortStatus(store, "auth-rewrite", t1);
    assert.equal(status.totalMs, 12 * 60 * 1000);
  });

  it("timeline reports live age for open sessions", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T10:00:00.000Z");
    const t1 = new Date("2026-03-01T10:05:00.000Z");
    ({ store } = startEffort(store, "auth-rewrite", t0));
    ({ store } = startSession(store, undefined, t0));
    const rows = timeline(store, 5, t1);
    assert.equal(rows[0]?.durationMs, 5 * 60 * 1000);
    assert.equal(rows[0]?.endedAt, null);
  });

  it("briefing marks missing session as unknown and includes freshness", () => {
    const store = emptyStore();
    const input = buildBriefingInput(store, new Date("2026-03-01T09:30:00.000Z"));
    assert.equal(input.activeSession, null);
    assert.equal(input.sessionAgeMs, null);
    assert.ok(input.generatedAt);

    const text = renderBriefing(store, new Date("2026-03-01T09:30:00.000Z"));
    assert.match(text, /Local time: /);
    assert.match(text, /Age: unknown/);
    assert.match(text, /Never invent time of day/);
    assert.match(text, /09:30:00/);
    assert.match(text, /Generated at:/);
    assert.match(text, /Stale after:/);
  });
});
