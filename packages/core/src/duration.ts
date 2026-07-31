/**
 * Parse a simple duration token such as 30m, 2h, 90s, 1d.
 */
export function parseDuration(raw: string): number {
  const trimmed = raw.trim().toLowerCase();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration "${raw}". Use forms like 30m, 2h, 90s, 1d.`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const mult =
    unit === "ms"
      ? 1
      : unit === "s"
        ? 1000
        : unit === "m"
          ? 60_000
          : unit === "h"
            ? 3_600_000
            : 86_400_000;
  return Math.round(value * mult);
}
