import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyStore } from "./store.js";
import {
  startEffort,
  effortStatus,
  findEffort,
  renameEffort,
  archiveEffort,
  deleteEffort,
  findNearDuplicateEffort,
} from "./effort.js";
import { startSession, endSession, timeline, sessionStatus } from "./session.js";
import { buildBriefingInput, renderBriefing, renderBriefingCompact, MODEL_RULES } from "./brief.js";

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

  it("includes open session age in effort status total matching briefing forever", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T10:00:00.000Z");
    const t1 = new Date("2026-03-01T10:12:00.000Z");
    ({ store } = startEffort(store, "auth-rewrite", t0));
    ({ store } = startSession(store, undefined, t0));
    const status = effortStatus(store, "auth-rewrite", t1);
    const brief = buildBriefingInput(store, t1);
    assert.equal(status.totalMs, 12 * 60 * 1000);
    assert.equal(brief.effortTotalMs, status.totalMs);
  });

  it("rejects a second session start without --force", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T10:00:00.000Z");
    ({ store } = startEffort(store, "auth-rewrite", t0));
    ({ store } = startSession(store, undefined, t0));
    assert.throws(() => startSession(store, undefined, t0), /already open/);
  });

  it("force end-and-restart session", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T10:00:00.000Z");
    const t1 = new Date("2026-03-01T10:10:00.000Z");
    ({ store } = startEffort(store, "auth-rewrite", t0));
    ({ store } = startSession(store, undefined, t0));
    const forced = startSession(store, undefined, t1, { force: true });
    store = forced.store;
    assert.ok(forced.forcedEnd);
    assert.equal(forced.forcedEnd?.endedAt, t1.toISOString());
    assert.equal(store.efforts[0]?.totalMs, 10 * 60 * 1000);
    assert.ok(store.activeSessionId);
  });

  it("session status reports live age", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T10:00:00.000Z");
    const t1 = new Date("2026-03-01T10:07:00.000Z");
    ({ store } = startEffort(store, "auth-rewrite", t0));
    ({ store } = startSession(store, undefined, t0));
    const st = sessionStatus(store, t1);
    assert.equal(st.ageMs, 7 * 60 * 1000);
    assert.equal(st.effort?.name, "auth-rewrite");
  });

  it("timeline reports live age for open sessions and filters by effort", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T10:00:00.000Z");
    const t1 = new Date("2026-03-01T10:05:00.000Z");
    ({ store } = startEffort(store, "auth-rewrite", t0));
    ({ store } = startSession(store, undefined, t0));
    store = endSession(store, t1).store;
    ({ store } = startEffort(store, "other", t1));
    ({ store } = startSession(store, undefined, t1));
    const rows = timeline(store, { limit: 5, now: new Date("2026-03-01T10:08:00.000Z") });
    assert.equal(rows[0]?.durationMs, 3 * 60 * 1000);
    assert.equal(rows[0]?.endedAt, null);
    const filtered = timeline(store, {
      limit: 10,
      effortName: "auth-rewrite",
      now: t1,
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.effortName, "auth-rewrite");
  });

  it("rename archive delete efforts", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T10:00:00.000Z");
    ({ store } = startEffort(store, "old-name", t0));
    ({ store } = renameEffort(store, "old-name", "new-name"));
    assert.equal(store.efforts[0]?.name, "new-name");
    ({ store } = archiveEffort(store, "new-name"));
    assert.equal(store.efforts[0]?.archived, true);
    assert.equal(store.activeEffortId, null);
    ({ store } = deleteEffort(store, "new-name"));
    assert.equal(store.efforts.length, 0);
  });

  it("warns on near-duplicate names", () => {
    let store = emptyStore();
    ({ store } = startEffort(store, "auth-rewrite", new Date("2026-03-01T10:00:00.000Z")));
    const near = findNearDuplicateEffort(store, "auth-rewrte");
    assert.equal(near?.name, "auth-rewrite");
    const created = startEffort(store, "auth-rewrte", new Date("2026-03-01T11:00:00.000Z"));
    assert.equal(created.nearDuplicate?.name, "auth-rewrite");
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
    assert.match(text, /ISO \(UTC\)/);
    assert.ok(MODEL_RULES.includes("Trust only this Temporal Briefing"));

    const compact = renderBriefingCompact(store, new Date("2026-03-01T09:30:00.000Z"));
    assert.match(compact, /iso\(UTC\)/);
    assert.match(compact, /session none/);
  });

  it("briefing notes soft cap on long open sessions", () => {
    let store = emptyStore();
    const t0 = new Date("2026-03-01T00:00:00.000Z");
    const t1 = new Date("2026-03-01T09:00:00.000Z");
    ({ store } = startEffort(store, "long", t0));
    ({ store } = startSession(store, undefined, t0));
    const text = renderBriefing(store, {
      nowDate: t1,
      openSessionSoftCapMs: 8 * 60 * 60 * 1000,
      openSessionWarnAfterMs: 4 * 60 * 60 * 1000,
    });
    assert.match(text, /Warning:/);
    assert.match(text, /Soft cap:/);
  });
});
