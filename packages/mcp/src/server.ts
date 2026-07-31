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
  saveStore,
  startEffort,
  listEfforts,
  startSession,
  endSession,
  renderBriefing,
  formatDuration,
  logManualDuration,
} from "@agent-wallclock/core";

const STORE_DIR = process.env.AGENT_WALLCLOCK_HOME?.trim() || getDefaultStoreDir();

function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
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
  "Return a Temporal Briefing with now, active session age, and active effort logged time. Use this instead of inventing durations.",
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
      return `${e.name} | ${active} | logged=${formatDuration(e.totalMs)} | sessions=${e.sessionCount} | started=${e.startedAt}`;
    });
    return textResult(lines.join("\n"));
  },
);

server.tool(
  "start_effort",
  "Create or select a named effort in the local store and make it active.",
  { name: z.string().min(1).describe("Effort name, e.g. auth-rewrite") },
  async ({ name }) => {
    let store = loadStore(STORE_DIR);
    const result = startEffort(store, name);
    saveStore(result.store, STORE_DIR);
    return textResult(
      result.created
        ? `Created effort "${result.effort.name}" (${result.effort.id})`
        : `Selected existing effort "${result.effort.name}" (${result.effort.id})`,
    );
  },
);

server.tool(
  "log_session",
  "Manage work sessions. action=start opens a session on an effort; action=end closes the open session and adds its duration to the effort; action=manual adds a duration without an open session.",
  {
    action: z.enum(["start", "end", "manual"]),
    effort: z.string().optional().describe("Effort name or id (for start/manual)"),
    duration: z
      .string()
      .optional()
      .describe("For manual only: duration like 30m, 2h, 90s"),
  },
  async ({ action, effort, duration }) => {
    let store = loadStore(STORE_DIR);

    if (action === "start") {
      const result = startSession(store, effort);
      saveStore(result.store, STORE_DIR);
      return textResult(`Session open on "${result.effort.name}" (${result.session.id})`);
    }

    if (action === "end") {
      const result = endSession(store);
      saveStore(result.store, STORE_DIR);
      return textResult(
        `Session closed. Duration=${formatDuration(result.durationMs)}. Effort total=${formatDuration(result.effort.totalMs)}`,
      );
    }

    if (!effort || !duration) {
      throw new Error("manual log_session requires effort and duration (e.g. 30m)");
    }
    const match = duration.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/);
    if (!match) {
      throw new Error(`Invalid duration "${duration}". Use 30m, 2h, 90s, or 1d.`);
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
    const ms = Math.round(value * mult);
    const result = logManualDuration(store, effort, ms);
    saveStore(result.store, STORE_DIR);
    return textResult(
      `Logged ${formatDuration(ms)} on "${result.effort.name}". Total=${formatDuration(result.effort.totalMs)}`,
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
