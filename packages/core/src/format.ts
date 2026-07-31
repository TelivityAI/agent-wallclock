/**
 * Format a duration for user-facing output.
 *
 * Units are d / h / m / s only (no weeks). Days stay as `Nd` so multi-week
 * spans remain unambiguous (e.g. 14d rather than 2w).
 *
 * Under 10 minutes, seconds are always shown for short-session precision
 * (e.g. `5m 30s`). At or above 10 minutes, seconds are omitted unless
 * they are the only non-zero unit.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return "unknown";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const underTenMinutes = totalSeconds < 10 * 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && (underTenMinutes || parts.length === 0)) {
    parts.push(`${seconds}s`);
  }
  if (parts.length === 0) {
    parts.push("0s");
  }

  return parts.join(" ");
}

export function ageMs(fromIso: string, now: Date = new Date()): number {
  const start = Date.parse(fromIso);
  if (!Number.isFinite(start)) {
    return NaN;
  }
  return Math.max(0, now.getTime() - start);
}
