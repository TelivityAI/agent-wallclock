#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getDefaultStoreDir,
  getNow,
  loadStore,
  updateStore,
  startEffort,
  listEfforts,
  startSession,
  endSession,
  sessionStatus,
  timeline,
  renderBriefing,
  formatDuration,
  logManualDuration,
  parseDuration,
  effortStatus,
  loadConfig,
} from "@agent-wallclock/core";

const STORE_DIR = process.env.AGENT_WALLCLOCK_HOME?.trim() || getDefaultStoreDir();
const WRITES_ENABLED = process.env.AGENT_WALLCLOCK_WRITES === "1";

function textResult(text: string, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    ...(isError ? { isError: true } : {}),
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return textResult(message, true);
}

function requireWrites(): void {
  if (!WRITES_ENABLED) {
    throw new Error(
      "MCP write tools are disabled. Set AGENT_WALLCLOCK_WRITES=1 to enable start_effort and log_session.",
    );
  }
}

const server = new McpServer({
  name: "agent-wallclock",
  version: "0.1.0",
});

server.tool(
  "get_now",
  "Return the current local wall-clock time, timezone, weekday, and ISO UTC timestamp from the system clock.",
  {},
  async () => {
    try {
      const now = getNow();
      return textResult(
        [
          `local_date=${now.localDate}`,
          `local_time=${now.localTime}`,
          `weekday=${now.weekday}`,
          `timezone=${now.timezone}`,
          `iso_utc=${now.iso}`,
        ].join("\n"),
      );
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_briefing",
  "Return a Temporal Briefing with generated-at freshness, now, active session age, and active effort logged time. Refresh if stale. Use this instead of inventing durations.",
  {},
  async () => {
    try {
      const store = loadStore(STORE_DIR);
      return textResult(renderBriefing(store, { storeDir: STORE_DIR }));
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "list_efforts",
  "List named efforts and their logged work time from the local Agent Wallclock store.",
  {},
  async () => {
    try {
      const store = loadStore(STORE_DIR);
      const efforts = listEfforts(store);
      if (efforts.length === 0) {
        return textResult("No efforts recorded.");
      }
      const lines = efforts.map((e) => {
        const active = store.activeEffortId === e.id ? "active" : "inactive";
        const status = effortStatus(store, e.id);
        return `${e.name} | ${active} | logged=${formatDuration(status.totalMs)} | sessions=${e.sessionCount} | started=${e.startedAt}`;
      });
      return textResult(lines.join("\n"));
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_session_status",
  "Return the open work session status and live age, or report that none is open.",
  {},
  async () => {
    try {
      const store = loadStore(STORE_DIR);
      const st = sessionStatus(store);
      if (!st.session) {
        return textResult("status=none");
      }
      const cfg = loadConfig();
      const lines = [
        `status=open`,
        `id=${st.session.id}`,
        `effort=${st.effort?.name ?? "unknown"}`,
        `started_utc=${st.session.startedAt}`,
        `age=${formatDuration(st.ageMs)}`,
        `age_ms=${st.ageMs ?? 0}`,
      ];
      if (st.ageMs != null && st.ageMs >= cfg.openSessionWarnAfterMs) {
        lines.push(`warn=open-session-age`);
      }
      if (st.ageMs != null && st.ageMs >= cfg.openSessionSoftCapMs) {
        lines.push(`soft_cap=exceeded`);
      }
      return textResult(lines.join("\n"));
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_timeline",
  "Return recent session timeline rows with live age for open sessions. Optional effort filter and limit.",
  {
    limit: z.number().int().positive().optional().describe("Max rows (default from config)"),
    effort: z.string().optional().describe("Filter by effort name or id"),
  },
  async ({ limit, effort }) => {
    try {
      const store = loadStore(STORE_DIR);
      const cfg = loadConfig();
      const rows = timeline(store, {
        limit: limit ?? cfg.timelineDefaultLimit,
        effortName: effort,
      });
      if (rows.length === 0) {
        return textResult("No sessions recorded.");
      }
      const lines = rows.map((r) => {
        const dur = r.durationMs != null ? formatDuration(r.durationMs) : "unknown";
        const state = r.endedAt ? "closed" : "open";
        return `${r.startedAt} | ${r.effortName} | ${dur} | ${state}`;
      });
      return textResult(lines.join("\n"));
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "start_effort",
  "Create or select a named effort in the local store and make it active. Requires AGENT_WALLCLOCK_WRITES=1.",
  { name: z.string().min(1).describe("Effort name, e.g. auth-rewrite") },
  async ({ name }) => {
    try {
      requireWrites();
      let created = false;
      let effortName = "";
      let effortId = "";
      let near = "";
      updateStore(STORE_DIR, (store) => {
        const result = startEffort(store, name);
        created = result.created;
        effortName = result.effort.name;
        effortId = result.effort.id;
        near = result.nearDuplicate?.name ?? "";
        return result.store;
      });
      const nearNote = near ? ` (similar to existing "${near}")` : "";
      return textResult(
        created
          ? `Created effort "${effortName}" (${effortId})${nearNote}`
          : `Selected existing effort "${effortName}" (${effortId})`,
      );
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "log_session",
  "Manage work sessions. action=start opens a session on an effort; action=end closes the open session and adds its duration to the effort; action=manual adds a duration without an open session. Requires AGENT_WALLCLOCK_WRITES=1. Durations use core parseDuration (e.g. 30m, 2h).",
  {
    action: z.enum(["start", "end", "manual"]),
    effort: z.string().optional().describe("Effort name or id (for start/manual)"),
    duration: z
      .string()
      .optional()
      .describe("For manual only: duration like 30m, 2h, 90s"),
    force: z
      .boolean()
      .optional()
      .describe("For start: end open session and restart"),
  },
  async ({ action, effort, duration, force }) => {
    try {
      requireWrites();

      if (action === "start") {
        let effortName = "";
        let sessionId = "";
        updateStore(STORE_DIR, (store) => {
          const result = startSession(store, effort, new Date(), { force: Boolean(force) });
          effortName = result.effort.name;
          sessionId = result.session.id;
          return result.store;
        });
        return textResult(`Session open on "${effortName}" (${sessionId})`);
      }

      if (action === "end") {
        let durationMs = 0;
        let totalMs = 0;
        updateStore(STORE_DIR, (store) => {
          const result = endSession(store);
          durationMs = result.durationMs;
          totalMs = result.effort.totalMs;
          return result.store;
        });
        return textResult(
          `Session closed. Duration=${formatDuration(durationMs)}. Effort total=${formatDuration(totalMs)}`,
        );
      }

      if (!effort || !duration) {
        throw new Error("manual log_session requires effort and duration (e.g. 30m)");
      }
      const ms = parseDuration(duration);
      let effortName = "";
      let totalMs = 0;
      updateStore(STORE_DIR, (store) => {
        const result = logManualDuration(store, effort, ms);
        effortName = result.effort.name;
        totalMs = result.effort.totalMs;
        return result.store;
      });
      return textResult(
        `Logged ${formatDuration(ms)} on "${effortName}". Total=${formatDuration(totalMs)}`,
      );
    } catch (err) {
      return errorResult(err);
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(resolve(process.argv[1]!)).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

export { server };
