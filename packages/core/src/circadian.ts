import type { CircadianBand, CircadianContext, DayKind } from "./types.js";

const TONE_HINTS: Record<CircadianBand, string> = {
  morning:
    "Prefer crisp, focused replies. Do not assume fatigue or end-of-day wind-down.",
  afternoon:
    "Prefer steady, practical replies. Do not assume morning urgency or evening wind-down.",
  evening:
    "Prefer clear, concise replies. Do not assume the user is winding down or should stop.",
  night:
    "Prefer calm, efficient replies. Do not assume fatigue or tell the user to sleep.",
};

/** Fixed local-hour bands (v1; not user-tunable). */
export function bandForLocalHour(hour: number): CircadianBand {
  if (hour < 0 || hour > 23 || !Number.isInteger(hour)) {
    throw new RangeError(`local hour must be an integer 0–23, got ${hour}`);
  }
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export function dayKindForDate(date: Date): DayKind {
  const day = date.getDay(); // 0 Sun … 6 Sat
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function toneHintForBand(band: CircadianBand): string {
  return TONE_HINTS[band];
}

export function classifyCircadian(nowDate: Date = new Date()): CircadianContext {
  const localHour = nowDate.getHours();
  const band = bandForLocalHour(localHour);
  const dayKind = dayKindForDate(nowDate);
  return {
    band,
    dayKind,
    localHour,
    toneHint: toneHintForBand(band),
  };
}
