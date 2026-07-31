import type { NowInfo } from "./types.js";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Injectable clock for deterministic tests. Defaults to system time. */
export type Clock = () => Date;

let clockImpl: Clock = () => new Date();

export function setClock(clock: Clock): void {
  clockImpl = clock;
}

export function resetClock(): void {
  clockImpl = () => new Date();
}

export function now(): Date {
  return clockImpl();
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function formatOffset(date: Date): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hours = pad(Math.floor(abs / 60));
  const minutes = pad(abs % 60);
  return `${sign}${hours}:${minutes}`;
}

export function getTimezoneName(date: Date = now()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "long",
    }).formatToParts(date);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function getIanaTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    return "unknown";
  }
}

export function getNow(date: Date = now()): NowInfo {
  const localDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const localTime = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  const iana = getIanaTimeZone();
  const named = getTimezoneName(date);
  const offset = formatOffset(date);

  return {
    iso: date.toISOString(),
    localDate,
    localTime,
    timezone: `${iana} (${named}, UTC${offset})`,
    timezoneOffset: offset,
    weekday: WEEKDAYS[date.getDay()] ?? "unknown",
    epochMs: date.getTime(),
  };
}
