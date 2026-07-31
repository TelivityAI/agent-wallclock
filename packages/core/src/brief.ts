import { getNow } from "./clock.js";
import { loadConfig } from "./config.js";
import { ageMs, formatDuration } from "./format.js";
import { getActiveSession } from "./session.js";
import type { BriefingInput, BriefingOptions, StoreData } from "./types.js";

/** @deprecated Prefer loadConfig().staleAfterMs */
export const BRIEFING_STALE_AFTER_MS = 15 * 60 * 1000;

/** @deprecated Prefer loadConfig().openSessionWarnAfterMs */
export const OPEN_SESSION_WARN_AFTER_MS = 4 * 60 * 60 * 1000;

/** @deprecated Prefer loadConfig().openSessionSoftCapMs */
export const OPEN_SESSION_SOFT_CAP_MS = 8 * 60 * 60 * 1000;

export const MODEL_RULES = [
  "Trust only this Temporal Briefing for clock, session age, and effort duration.",
  "Never invent time of day, how long the user has been working, or effort history.",
  "If a field is missing or unknown, say unknown or ask — do not guess.",
  "Do not give sleep, circadian, or \"you have done enough\" advice based on invented duration.",
  "If Generated-at is older than the stated freshness window, ask for a refreshed briefing before time-based claims.",
].join(" ");

export function buildBriefingInput(
  store: StoreData,
  nowDateOrOpts: Date | BriefingOptions = new Date(),
): BriefingInput {
  const opts: BriefingOptions =
    nowDateOrOpts instanceof Date ? { nowDate: nowDateOrOpts } : nowDateOrOpts;
  const cfg = loadConfig();
  const nowDate = opts.nowDate ?? new Date();
  const staleAfterMs = opts.staleAfterMs ?? cfg.staleAfterMs;
  const openSessionWarnAfterMs =
    opts.openSessionWarnAfterMs ?? cfg.openSessionWarnAfterMs;
  const openSessionSoftCapMs =
    opts.openSessionSoftCapMs ?? cfg.openSessionSoftCapMs;

  const now = getNow(nowDate);
  const activeSession = getActiveSession(store);
  const activeEffort = store.activeEffortId
    ? store.efforts.find((e) => e.id === store.activeEffortId) ?? null
    : null;

  let sessionAgeMs: number | null = null;
  if (activeSession) {
    const age = ageMs(activeSession.startedAt, nowDate);
    sessionAgeMs = Number.isFinite(age) ? age : null;
  }

  let effortAgeMs: number | null = null;
  let effortTotalMs: number | null = null;
  if (activeEffort) {
    const age = ageMs(activeEffort.startedAt, nowDate);
    effortAgeMs = Number.isFinite(age) ? age : null;
    effortTotalMs = activeEffort.totalMs;
    if (activeSession && activeSession.effortId === activeEffort.id && sessionAgeMs != null) {
      effortTotalMs += sessionAgeMs;
    }
  }

  return {
    now,
    generatedAt: now.iso,
    staleAfterMs,
    activeEffort,
    activeSession,
    sessionAgeMs,
    effortAgeMs,
    effortTotalMs,
    openSessionWarn:
      sessionAgeMs != null && sessionAgeMs >= openSessionWarnAfterMs,
    openSessionCapNote:
      sessionAgeMs != null && sessionAgeMs >= openSessionSoftCapMs,
  };
}

export function renderBriefing(
  store: StoreData,
  nowDateOrOpts: Date | BriefingOptions = new Date(),
): string {
  const opts: BriefingOptions =
    nowDateOrOpts instanceof Date ? { nowDate: nowDateOrOpts } : nowDateOrOpts;
  const input = buildBriefingInput(store, opts);
  const cfg = loadConfig();
  const warnAfter = opts.openSessionWarnAfterMs ?? cfg.openSessionWarnAfterMs;
  const softCap = opts.openSessionSoftCapMs ?? cfg.openSessionSoftCapMs;

  const lines: string[] = [
    "# Temporal Briefing (Agent Wallclock)",
    "",
    "## Freshness",
    `- Generated at: ${input.generatedAt}`,
    `- Stale after: ${formatDuration(input.staleAfterMs)} — refresh with \`wallclock brief\` or MCP \`get_briefing\` before time-based advice`,
    "",
    "## Now",
    `- Local date: ${input.now.localDate}`,
    `- Local time: ${input.now.localTime}`,
    `- Weekday: ${input.now.weekday}`,
    `- Timezone: ${input.now.timezone}`,
    `- ISO (UTC): ${input.now.iso}`,
    "",
    "## Active session",
  ];

  if (input.activeSession && input.sessionAgeMs != null) {
    lines.push(`- Status: open`);
    lines.push(`- Started: ${input.activeSession.startedAt} (UTC)`);
    lines.push(`- Age: ${formatDuration(input.sessionAgeMs)} (${input.sessionAgeMs} ms)`);
    if (input.openSessionWarn) {
      lines.push(
        `- Warning: open session older than ${formatDuration(warnAfter)} — confirm it is still intentional, or run \`wallclock session end\``,
      );
    }
    if (input.openSessionCapNote) {
      lines.push(
        `- Soft cap: open session exceeded ${formatDuration(softCap)} — consider ending and starting a fresh session block`,
      );
    }
  } else {
    lines.push(`- Status: none`);
    lines.push(`- Age: unknown`);
  }

  lines.push("");
  lines.push("## Active effort");

  if (input.activeEffort) {
    lines.push(`- Name: ${input.activeEffort.name}`);
    lines.push(`- Started: ${input.activeEffort.startedAt} (UTC)`);
    lines.push(
      `- Calendar age: ${input.effortAgeMs != null ? formatDuration(input.effortAgeMs) : "unknown"}`,
    );
    lines.push(
      `- Logged work time: ${input.effortTotalMs != null ? formatDuration(input.effortTotalMs) : "unknown"} (includes open session if any)`,
    );
    lines.push(`- Sessions: ${input.activeEffort.sessionCount}`);
    lines.push(
      `- Last activity: ${input.activeEffort.lastActivityAt != null ? `${input.activeEffort.lastActivityAt} (UTC)` : "unknown"}`,
    );
  } else {
    lines.push(`- Name: none`);
    lines.push(`- Calendar age: unknown`);
    lines.push(`- Logged work time: unknown`);
  }

  lines.push("");
  lines.push("## Model rules");
  lines.push(MODEL_RULES);
  lines.push("");

  return lines.join("\n");
}

/** One-screen compact briefing for terminals. */
export function renderBriefingCompact(
  store: StoreData,
  nowDateOrOpts: Date | BriefingOptions = new Date(),
): string {
  const opts: BriefingOptions =
    nowDateOrOpts instanceof Date ? { nowDate: nowDateOrOpts } : nowDateOrOpts;
  const input = buildBriefingInput(store, opts);
  const session =
    input.activeSession && input.sessionAgeMs != null
      ? `open ${formatDuration(input.sessionAgeMs)}`
      : "none";
  const effort = input.activeEffort
    ? `${input.activeEffort.name} logged=${formatDuration(input.effortTotalMs)}`
    : "none";
  return [
    `now ${input.now.localDate} ${input.now.localTime} ${input.now.weekday} (${input.now.timezone})`,
    `iso(UTC) ${input.now.iso}  stale-after ${formatDuration(input.staleAfterMs)}`,
    `session ${session}`,
    `effort ${effort}`,
  ].join("\n");
}
