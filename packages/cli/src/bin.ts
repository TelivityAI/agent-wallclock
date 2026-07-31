#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getNow,
  initStore,
  loadStore,
  saveStore,
  getDefaultStoreDir,
  startEffort,
  listEfforts,
  effortStatus,
  logManualDuration,
  startSession,
  endSession,
  timeline,
  renderBriefing,
  formatDuration,
} from "@agent-wallclock/core";
import { copyToClipboard } from "./copy.js";
import { parseDurationArg } from "./parse.js";

const STORE_DIR = process.env.AGENT_WALLCLOCK_HOME?.trim() || getDefaultStoreDir();

function printHelp(): void {
  console.log(`Agent Wallclock — local temporal context for language models

Usage:
  wallclock now
  wallclock brief [--copy]
  wallclock effort start <name>
  wallclock effort list
  wallclock effort status [name]
  wallclock effort log <name> <duration>   # e.g. 30m, 2h
  wallclock session start [effort]
  wallclock session end
  wallclock timeline [limit]
  wallclock init

Environment:
  AGENT_WALLCLOCK_HOME   Override store directory (default: ~/.agent-wallclock)

Privacy: store is local JSON only. No network calls.
`);
}

function adaptersRoot(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../../adapters"),
    join(here, "../../adapters"),
    join(process.cwd(), "adapters"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function cmdNow(): void {
  const now = getNow();
  console.log(`Local date:  ${now.localDate}`);
  console.log(`Local time:  ${now.localTime}`);
  console.log(`Weekday:     ${now.weekday}`);
  console.log(`Timezone:    ${now.timezone}`);
  console.log(`ISO (UTC):   ${now.iso}`);
}

function cmdBrief(args: string[]): void {
  const store = loadStore(STORE_DIR);
  const text = renderBriefing(store);
  const copy = args.includes("--copy");
  if (copy) {
    const ok = copyToClipboard(text);
    if (ok) {
      console.log("Temporal Briefing copied to clipboard.");
    } else {
      console.error("Could not copy to clipboard; printing instead.");
      console.log(text);
    }
  } else {
    process.stdout.write(text);
  }
}

function cmdEffort(args: string[]): void {
  const sub = args[0];
  if (!sub) {
    throw new Error("Missing effort subcommand. Try: start | list | status | log");
  }

  if (sub === "start") {
    const name = args.slice(1).join(" ").trim();
    if (!name) throw new Error("Usage: wallclock effort start <name>");
    let store = loadStore(STORE_DIR);
    const result = startEffort(store, name);
    saveStore(result.store, STORE_DIR);
    console.log(
      result.created
        ? `Started effort "${result.effort.name}" (${result.effort.id})`
        : `Using existing effort "${result.effort.name}" (${result.effort.id})`,
    );
    return;
  }

  if (sub === "list") {
    const store = loadStore(STORE_DIR);
    const efforts = listEfforts(store);
    if (efforts.length === 0) {
      console.log("No efforts yet.");
      return;
    }
    for (const e of efforts) {
      const active = store.activeEffortId === e.id ? " [active]" : "";
      console.log(
        `${e.name}${active}  logged=${formatDuration(e.totalMs)}  sessions=${e.sessionCount}  started=${e.startedAt}`,
      );
    }
    return;
  }

  if (sub === "status") {
    const name = args.slice(1).join(" ").trim() || undefined;
    const store = loadStore(STORE_DIR);
    const status = effortStatus(store, name);
    if (!status.effort) {
      console.log("No effort selected.");
      return;
    }
    console.log(`Name:           ${status.effort.name}`);
    console.log(`Active:         ${status.isActive ? "yes" : "no"}`);
    console.log(`Started:        ${status.effort.startedAt}`);
    console.log(`Calendar age:   ${formatDuration(status.ageMs)}`);
    console.log(`Logged work:    ${formatDuration(status.totalMs)}`);
    console.log(`Sessions:       ${status.effort.sessionCount}`);
    console.log(`Last activity:  ${status.effort.lastActivityAt ?? "unknown"}`);
    return;
  }

  if (sub === "log") {
    const name = args[1];
    const dur = args[2];
    if (!name || !dur) throw new Error("Usage: wallclock effort log <name> <duration>");
    let store = loadStore(STORE_DIR);
    const ms = parseDurationArg(dur);
    const result = logManualDuration(store, name, ms);
    saveStore(result.store, STORE_DIR);
    console.log(
      `Logged ${formatDuration(ms)} on "${result.effort.name}". Total=${formatDuration(result.effort.totalMs)}`,
    );
    return;
  }

  throw new Error(`Unknown effort subcommand: ${sub}`);
}

function cmdSession(args: string[]): void {
  const sub = args[0];
  if (sub === "start") {
    const effort = args.slice(1).join(" ").trim() || undefined;
    let store = loadStore(STORE_DIR);
    const result = startSession(store, effort);
    saveStore(result.store, STORE_DIR);
    console.log(`Session open on "${result.effort.name}" (${result.session.id})`);
    return;
  }
  if (sub === "end") {
    let store = loadStore(STORE_DIR);
    const result = endSession(store);
    saveStore(result.store, STORE_DIR);
    console.log(
      `Session closed. Duration=${formatDuration(result.durationMs)}. Effort "${result.effort.name}" total=${formatDuration(result.effort.totalMs)}`,
    );
    return;
  }
  throw new Error("Usage: wallclock session start [effort] | wallclock session end");
}

function cmdTimeline(args: string[]): void {
  const limit = args[0] ? Number(args[0]) : 20;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("timeline limit must be a positive number");
  }
  const store = loadStore(STORE_DIR);
  const rows = timeline(store, limit);
  if (rows.length === 0) {
    console.log("No sessions yet.");
    return;
  }
  for (const row of rows) {
    const dur = row.durationMs != null ? formatDuration(row.durationMs) : "open/unknown";
    console.log(
      `${row.startedAt}  ${row.effortName}  ${dur}  ${row.endedAt ? "closed" : "open"}`,
    );
  }
}

function cmdInit(): void {
  const store = initStore(STORE_DIR);
  console.log(`Store ready at ${STORE_DIR}`);
  console.log(`Efforts: ${store.efforts.length}; sessions: ${store.sessions.length}`);
  console.log("");
  console.log("Next:");
  console.log("  1. wallclock effort start <name>");
  console.log("  2. wallclock session start");
  console.log("  3. wallclock brief");
  console.log("");
  const root = adaptersRoot();
  if (root) {
    console.log("Host adapters:");
    for (const name of [
      "generic-system-prompt.md",
      "chatgpt-custom-instructions.md",
      "claude-project-instructions.md",
      "cursor-skill/SKILL.md",
    ]) {
      const path = join(root, name);
      if (existsSync(path) || existsSync(join(root, name.replace(/\/SKILL\.md$/, "")))) {
        console.log(`  - ${path}`);
      }
    }
    try {
      const generic = readFileSync(join(root, "generic-system-prompt.md"), "utf8");
      console.log("");
      console.log("--- generic adapter (excerpt) ---");
      console.log(generic.split("\n").slice(0, 12).join("\n"));
    } catch {
      // optional
    }
  } else {
    console.log("Adapters live in the repo under adapters/ after clone.");
  }
}

function main(argv: string[]): void {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
    printHelp();
    return;
  }

  switch (cmd) {
    case "now":
      cmdNow();
      break;
    case "brief":
      cmdBrief(rest);
      break;
    case "effort":
      cmdEffort(rest);
      break;
    case "session":
      cmdSession(rest);
      break;
    case "timeline":
      cmdTimeline(rest);
      break;
    case "init":
      cmdInit();
      break;
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}

try {
  main(process.argv.slice(2));
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
}
