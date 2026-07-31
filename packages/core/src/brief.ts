import { getNow } from "./clock.js";
import { ageMs, formatDuration } from "./format.js";
import { getActiveSession } from "./session.js";
import type { BriefingInput, StoreData } from "./types.js";

export const MODEL_RULES = [
  "Trust only this Temporal Briefing for clock, session age, and effort duration.",
  "Never invent time of day, how long the user has been working, or effort history.",
  "If a field is missing or unknown, say unknown or ask — do not guess.",
  "Do not give sleep, circadian, or \"you have done enough\" advice based on invented duration.",
].join(" ");

export function buildBriefingInput(
  store: StoreData,
  nowDate: Date = new Date(),
): BriefingInput {
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
    activeEffort,
    activeSession,
    sessionAgeMs,
    effortAgeMs,
    effortTotalMs,
  };
}

export function renderBriefing(store: StoreData, nowDate: Date = new Date()): string {
  const input = buildBriefingInput(store, nowDate);
  const lines: string[] = [
    "# Temporal Briefing (Agent Wallclock)",
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
    lines.push(`- Started: ${input.activeSession.startedAt}`);
    lines.push(`- Age: ${formatDuration(input.sessionAgeMs)} (${input.sessionAgeMs} ms)`);
  } else {
    lines.push(`- Status: none`);
    lines.push(`- Age: unknown`);
  }

  lines.push("");
  lines.push("## Active effort");

  if (input.activeEffort) {
    lines.push(`- Name: ${input.activeEffort.name}`);
    lines.push(`- Started: ${input.activeEffort.startedAt}`);
    lines.push(
      `- Calendar age: ${input.effortAgeMs != null ? formatDuration(input.effortAgeMs) : "unknown"}`,
    );
    lines.push(
      `- Logged work time: ${input.effortTotalMs != null ? formatDuration(input.effortTotalMs) : "unknown"} (includes open session if any)`,
    );
    lines.push(`- Sessions: ${input.activeEffort.sessionCount}`);
    lines.push(`- Last activity: ${input.activeEffort.lastActivityAt ?? "unknown"}`);
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
