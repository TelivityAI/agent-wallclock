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
  renderBriefing,
  formatDuration,
  logManualDuration,
  parseDuration,
  effortStatus,
} from "@agent-wallclock/core";

const STORE_DIR = process.env.AGENT_WALLCLOCK_HOME?.trim() || getDefaultStoreDir();
const WRITES_ENABLED = process.env.AGENT_WALLCLOCK_WRITES === "1";

function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
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
  },
);

server.tool(
  "get_briefing",
  "Return a Temporal Briefing with generated-at freshness, now, active session age, and active effort logged time. Refresh if stale. Use this instead of inventing durations.",
  {},
  async () => {
    const store = loadStore(STORE_DIR);
    return textResult(renderBriefing(store));
  },
);

server.tool(
  "list_efforts",
  "List named efforts and their logged work time from the local Agent Wallclock store.",
  {},
  async () => {
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
  },
);

server.tool(
  "start_effort",
  "Create or select a named effort in the local store and make it active. Requires AGENT_WALLCLOCK_WRITES=1.",
  { name: z.string().min(1).describe("Effort name, e.g. auth-rewrite") },
  async ({ name }) => {
    requireWrites();
    let created = false;
    let effortName = "";
    let effortId = "";
    updateStore(STORE_DIR, (store) => {
      const result = startEffort(store, name);
      created = result.created;
      effortName = result.effort.name;
      effortId = result.effort.id;
      return result.store;
    });
    return textResult(
      created
        ? `Created effort "${effortName}" (${effortId})`
        : `Selected existing effort "${effortName}" (${effortId})`,
    );
  },
);

server.tool(
  "log_session",
  "Manage work sessions. action=start opens a session on an effort; action=end closes the open session and adds its duration to the effort; action=manual adds a duration without an open session. Requires AGENT_WALLCLOCK_WRITES=1.",
  {
    action: z.enum(["start", "end", "manual"]),
    effort: z.string().optional().describe("Effort name or id (for start/manual)"),
    duration: z
      .string()
      .optional()
      .describe("For manual only: duration like 30m, 2h, 90s"),
  },
  async ({ action, effort, duration }) => {
    requireWrites();

    if (action === "start") {
      let effortName = "";
      let sessionId = "";
      updateStore(STORE_DIR, (store) => {
        const result = startSession(store, effort);
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
