/**
 * Runtime config from environment (and optional overrides).
 * All values are local-only; none trigger network I/O.
 */

const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;
const DEFAULT_OPEN_SESSION_WARN_MS = 4 * 60 * 60 * 1000;
const DEFAULT_OPEN_SESSION_SOFT_CAP_MS = 8 * 60 * 60 * 1000;
const DEFAULT_TIMELINE_LIMIT = 20;
const DEFAULT_HUGE_STORE_SESSIONS = 500;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export interface WallclockConfig {
  staleAfterMs: number;
  openSessionWarnAfterMs: number;
  openSessionSoftCapMs: number;
  timelineDefaultLimit: number;
  hugeStoreSessionWarn: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WallclockConfig {
  return {
    staleAfterMs: parsePositiveInt(
      env.AGENT_WALLCLOCK_STALE_AFTER_MS,
      DEFAULT_STALE_AFTER_MS,
    ),
    openSessionWarnAfterMs: parsePositiveInt(
      env.AGENT_WALLCLOCK_OPEN_SESSION_WARN_MS,
      DEFAULT_OPEN_SESSION_WARN_MS,
    ),
    openSessionSoftCapMs: parsePositiveInt(
      env.AGENT_WALLCLOCK_OPEN_SESSION_SOFT_CAP_MS,
      DEFAULT_OPEN_SESSION_SOFT_CAP_MS,
    ),
    timelineDefaultLimit: parsePositiveInt(
      env.AGENT_WALLCLOCK_TIMELINE_LIMIT,
      DEFAULT_TIMELINE_LIMIT,
    ),
    hugeStoreSessionWarn: parsePositiveInt(
      env.AGENT_WALLCLOCK_HUGE_STORE_SESSIONS,
      DEFAULT_HUGE_STORE_SESSIONS,
    ),
  };
}

export {
  DEFAULT_STALE_AFTER_MS,
  DEFAULT_OPEN_SESSION_WARN_MS,
  DEFAULT_OPEN_SESSION_SOFT_CAP_MS,
  DEFAULT_TIMELINE_LIMIT,
  DEFAULT_HUGE_STORE_SESSIONS,
};
