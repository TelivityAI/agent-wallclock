import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import {
  bandForLocalHour,
  classifyCircadian,
  dayKindForDate,
  toneHintForBand,
} from "./circadian.js";
import {
  buildBriefingInput,
  renderBriefing,
  renderBriefingCompact,
  MODEL_RULES,
} from "./brief.js";
import { emptyStore } from "./store.js";
import { defaultPrefs, getPrefsFilePath, loadPrefs, savePrefs } from "./prefs.js";

function localAt(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

describe("circadian bands", () => {
  it("classifies fixed local-hour boundaries", () => {
    assert.equal(bandForLocalHour(0), "night");
    assert.equal(bandForLocalHour(4), "night");
    assert.equal(bandForLocalHour(5), "morning");
    assert.equal(bandForLocalHour(11), "morning");
    assert.equal(bandForLocalHour(12), "afternoon");
    assert.equal(bandForLocalHour(16), "afternoon");
    assert.equal(bandForLocalHour(17), "evening");
    assert.equal(bandForLocalHour(21), "evening");
    assert.equal(bandForLocalHour(22), "night");
    assert.equal(bandForLocalHour(23), "night");

    const nightEarly = classifyCircadian(localAt(2026, 3, 2, 4, 59));
    assert.equal(nightEarly.band, "night");
    assert.equal(nightEarly.localHour, 4);

    const morning = classifyCircadian(localAt(2026, 3, 2, 5, 0));
    assert.equal(morning.band, "morning");
    assert.equal(morning.localHour, 5);

    const afternoon = classifyCircadian(localAt(2026, 3, 2, 12, 0));
    assert.equal(afternoon.band, "afternoon");

    const evening = classifyCircadian(localAt(2026, 3, 2, 17, 0));
    assert.equal(evening.band, "evening");

    const nightLate = classifyCircadian(localAt(2026, 3, 2, 22, 0));
    assert.equal(nightLate.band, "night");
  });

  it("distinguishes weekday vs weekend", () => {
    // 2026-03-02 is Monday; 2026-03-01 is Sunday
    assert.equal(dayKindForDate(localAt(2026, 3, 2, 10)), "weekday");
    assert.equal(dayKindForDate(localAt(2026, 3, 1, 10)), "weekend");
    assert.equal(dayKindForDate(localAt(2026, 3, 7, 10)), "weekend"); // Saturday
    assert.equal(classifyCircadian(localAt(2026, 3, 2, 9)).dayKind, "weekday");
    assert.equal(classifyCircadian(localAt(2026, 3, 1, 9)).dayKind, "weekend");
  });

  it("uses non-moralizing tone hints", () => {
    for (const band of ["morning", "afternoon", "evening", "night"] as const) {
      const hint = toneHintForBand(band);
      assert.ok(hint.length > 0);
      assert.doesNotMatch(hint, /go to sleep|stop working|you should rest/i);
    }
    assert.match(toneHintForBand("morning"), /crisp|focused/i);
    assert.match(toneHintForBand("night"), /calm|efficient/i);
  });
});

describe("prefs", () => {
  const dir = mkdtempSync(join(tmpdir(), "agent-wallclock-prefs-"));

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("defaults circadian off when config.json is missing", () => {
    assert.deepEqual(loadPrefs(dir), defaultPrefs());
    assert.equal(loadPrefs(dir).circadianEnabled, false);
  });

  it("round-trips circadianEnabled with restrictive perms", () => {
    savePrefs({ circadianEnabled: true }, dir);
    assert.equal(loadPrefs(dir).circadianEnabled, true);
    if (process.platform !== "win32") {
      const st = statSync(getPrefsFilePath(dir));
      assert.equal(st.mode & 0o777, 0o600);
    }
    savePrefs({ circadianEnabled: false }, dir);
    assert.equal(loadPrefs(dir).circadianEnabled, false);
  });
});

describe("briefing circadian opt-in", () => {
  const store = emptyStore();
  const morning = localAt(2026, 3, 2, 9, 30); // Monday morning

  it("omits Circadian when disabled (default)", () => {
    const input = buildBriefingInput(store, {
      nowDate: morning,
      circadianEnabled: false,
    });
    assert.equal(input.circadian, null);

    const text = renderBriefing(store, {
      nowDate: morning,
      circadianEnabled: false,
    });
    assert.doesNotMatch(text, /## Circadian/);

    const compact = renderBriefingCompact(store, {
      nowDate: morning,
      circadianEnabled: false,
    });
    assert.doesNotMatch(compact, /^circadian /m);

    assert.match(MODEL_RULES, /If a Circadian block is present/);
  });

  it("includes Circadian block when enabled", () => {
    const input = buildBriefingInput(store, {
      nowDate: morning,
      circadianEnabled: true,
    });
    assert.ok(input.circadian);
    assert.equal(input.circadian?.band, "morning");
    assert.equal(input.circadian?.dayKind, "weekday");
    assert.equal(input.circadian?.localHour, 9);

    const text = renderBriefing(store, {
      nowDate: morning,
      circadianEnabled: true,
    });
    assert.match(text, /## Circadian/);
    assert.match(text, /Band: morning \(local hour 09\)/);
    assert.match(text, /Day: weekday/);
    assert.match(text, /Tone: /);
    // Circadian appears after Now
    const nowIdx = text.indexOf("## Now");
    const circIdx = text.indexOf("## Circadian");
    const sessionIdx = text.indexOf("## Active session");
    assert.ok(nowIdx >= 0 && circIdx > nowIdx && sessionIdx > circIdx);

    const compact = renderBriefingCompact(store, {
      nowDate: morning,
      circadianEnabled: true,
    });
    assert.match(compact, /circadian morning weekday/);
  });

  it("loads prefs from storeDir when override omitted", () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-wallclock-brief-prefs-"));
    try {
      savePrefs({ circadianEnabled: true }, dir);
      const input = buildBriefingInput(store, {
        nowDate: morning,
        storeDir: dir,
      });
      assert.equal(input.circadian?.band, "morning");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
