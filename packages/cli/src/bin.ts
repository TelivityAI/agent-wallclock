#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  getNow,
  initStore,
  loadStore,
  updateStore,
  getDefaultStoreDir,
  startEffort,
  listEfforts,
  effortStatus,
  logManualDuration,
  renameEffort,
  archiveEffort,
  deleteEffort,
  startSession,
  endSession,
  sessionStatus,
  timeline,
  renderBriefing,
  renderBriefingCompact,
  buildBriefingInput,
  formatDuration,
  parseDuration,
  backupStore,
  restoreStore,
  runDoctor,
  loadConfig,
  loadPrefs,
  savePrefs,
  classifyCircadian,
  classifyError,
  CliError,
  ExitCode,
  MODEL_RULES,
} from "@agent-wallclock/core";
import { copyToClipboard, clipboardHint } from "./copy.js";

const STORE_DIR = process.env.AGENT_WALLCLOCK_HOME?.trim() || getDefaultStoreDir();
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function packageVersion(): string {
  try {
    const pkg = require("../package.json") as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function colorEnabled(): boolean {
  if (process.env.NO_COLOR != null && process.env.NO_COLOR !== "") return false;
  if (process.env.FORCE_COLOR === "0") return false;
  return Boolean(process.stdout.isTTY);
}

function paint(text: string, code: string): string {
  if (!colorEnabled()) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

function printHelp(): void {
  console.log(`Agent Wallclock — local temporal context for language models

Usage:
  wallclock now
  wallclock brief [--copy] [--json] [--compact]
  wallclock circadian on|off|status
  wallclock effort start <name>
  wallclock effort list [--json] [--all]
  wallclock effort status [name]
  wallclock effort rename <old> <new>
  wallclock effort archive <name>
  wallclock effort unarchive <name>
  wallclock effort delete <name> --confirm
  wallclock effort log <name...> <duration>   # duration is the last token (e.g. 30m)
  wallclock session start [effort] [--force]
  wallclock session end
  wallclock session status
  wallclock timeline [limit] [--json] [--effort <name>]
  wallclock store backup [path]
  wallclock store restore <path>
  wallclock doctor [--repair]
  wallclock where
  wallclock mcp-config --print <claude|cursor|vscode> [--check]
  wallclock init
  wallclock completion bash|zsh
  wallclock --version

Examples:
  wallclock init
  wallclock effort start auth-rewrite
  wallclock session start
  wallclock brief --copy
  wallclock brief --json | jq .generatedAt
  wallclock circadian on
  wallclock circadian status
  wallclock timeline 10 --effort auth-rewrite
  wallclock mcp-config --print cursor --check
  wallclock doctor

Install (from repo root after npm install && npm run build):
  npm link -w @agent-wallclock/cli
  # or: npm exec -w @agent-wallclock/cli -- wallclock ...

Environment:
  AGENT_WALLCLOCK_HOME                  Override store directory (default: ~/.agent-wallclock)
  AGENT_WALLCLOCK_WRITES=1              Enable MCP write tools (start_effort, log_session)
  AGENT_WALLCLOCK_STALE_AFTER_MS        Briefing freshness window (default 900000 = 15m)
  AGENT_WALLCLOCK_OPEN_SESSION_WARN_MS  Open-session warning threshold (default 4h)
  AGENT_WALLCLOCK_OPEN_SESSION_SOFT_CAP_MS  Soft-cap note threshold (default 8h)
  AGENT_WALLCLOCK_TIMELINE_LIMIT        Default timeline row limit (default 20)
  AGENT_WALLCLOCK_LOCK_STRICT=1         Fail on store lock contention instead of warning
  NO_COLOR                              Disable ANSI colors

Privacy: store is local JSON only. No network calls from this CLI.
Pastes upload briefing data to the host. MCP with writes enabled can mutate the ledger.

Exit codes: 0 ok | 2 usage | 3 not found | 4 conflict | 5 store | 6 lock | 7 io | 1 other
`);
}

function adaptersRoot(): string | null {
  const candidates = [
    join(HERE, "../../../adapters"),
    join(HERE, "../../adapters"),
    join(process.cwd(), "adapters"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function mcpServerPath(): string {
  const candidates = [
    resolve(HERE, "../../mcp/dist/server.js"),
    resolve(HERE, "../../../packages/mcp/dist/server.js"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]!;
}

function cliBinPath(): string {
  return resolve(HERE, "bin.js");
}

function takeFlag(args: string[], flag: string): boolean {
  const idx = args.indexOf(flag);
  if (idx >= 0) {
    args.splice(idx, 1);
    return true;
  }
  return false;
}

function takeOption(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx >= 0) {
    const val = args[idx + 1];
    args.splice(idx, 2);
    return val;
  }
  return undefined;
}

function cmdNow(): void {
  const now = getNow();
  console.log(`Local date:  ${now.localDate}`);
  console.log(`Local time:  ${now.localTime}`);
  console.log(`Weekday:     ${now.weekday}`);
  console.log(`Timezone:    ${now.timezone}`);
  console.log(`ISO (UTC):   ${now.iso}`);
}

function briefingOpts() {
  return { storeDir: STORE_DIR };
}

function cmdBrief(args: string[]): void {
  const copy = takeFlag(args, "--copy");
  const asJson = takeFlag(args, "--json");
  const compact = takeFlag(args, "--compact");
  const store = loadStore(STORE_DIR);
  const opts = briefingOpts();

  let text: string;
  if (asJson) {
    const input = buildBriefingInput(store, opts);
    text = `${JSON.stringify({ ...input, modelRules: MODEL_RULES }, null, 2)}\n`;
  } else if (compact) {
    text = `${renderBriefingCompact(store, opts)}\n`;
  } else {
    text = renderBriefing(store, opts);
  }

  if (copy) {
    const ok = copyToClipboard(text);
    if (ok) {
      console.log("Temporal Briefing copied to clipboard.");
    } else {
      console.error(`Could not copy to clipboard. ${clipboardHint()}`);
      console.error("Printing instead:");
      process.stdout.write(text);
      process.exitCode = ExitCode.IO;
    }
  } else {
    process.stdout.write(text);
  }
}

function cmdEffort(args: string[]): void {
  const sub = args[0];
  if (!sub) {
    throw new CliError(
      "Missing effort subcommand. Try: start | list | status | log | rename | archive | delete",
      ExitCode.USAGE,
    );
  }

  if (sub === "start") {
    const name = args.slice(1).join(" ").trim();
    if (!name) throw new CliError("Usage: wallclock effort start <name>", ExitCode.USAGE);
    let created = false;
    let effortName = "";
    let effortId = "";
    let nearName = "";
    updateStore(STORE_DIR, (store) => {
      const result = startEffort(store, name);
      created = result.created;
      effortName = result.effort.name;
      effortId = result.effort.id;
      nearName = result.nearDuplicate?.name ?? "";
      return result.store;
    });
    if (nearName) {
      console.error(
        `warning: "${effortName}" is similar to existing effort "${nearName}"`,
      );
    }
    console.log(
      created
        ? `Started effort "${effortName}" (${effortId})`
        : `Using existing effort "${effortName}" (${effortId})`,
    );
    return;
  }

  if (sub === "list") {
    const asJson = takeFlag(args, "--json");
    const includeArchived = takeFlag(args, "--all");
    const store = loadStore(STORE_DIR);
    const efforts = listEfforts(store, { includeArchived });
    if (asJson) {
      console.log(
        JSON.stringify(
          efforts.map((e) => {
            const status = effortStatus(store, e.id);
            return {
              ...e,
              loggedMs: status.totalMs,
              active: store.activeEffortId === e.id,
            };
          }),
          null,
          2,
        ),
      );
      return;
    }
    if (efforts.length === 0) {
      console.log("No efforts yet.");
      return;
    }
    for (const e of efforts) {
      const active = store.activeEffortId === e.id ? paint(" [active]", "32") : "";
      const archived = e.archived ? paint(" [archived]", "33") : "";
      const status = effortStatus(store, e.id);
      console.log(
        `${e.name}${active}${archived}  logged=${formatDuration(status.totalMs)}  sessions=${e.sessionCount}  started=${e.startedAt} (UTC)`,
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
    console.log(`Archived:       ${status.effort.archived ? "yes" : "no"}`);
    console.log(`Started:        ${status.effort.startedAt} (UTC)`);
    console.log(`Calendar age:   ${formatDuration(status.ageMs)}`);
    console.log(`Logged work:    ${formatDuration(status.totalMs)} (includes open session if any)`);
    console.log(`Sessions:       ${status.effort.sessionCount}`);
    console.log(
      `Last activity:  ${status.effort.lastActivityAt != null ? `${status.effort.lastActivityAt} (UTC)` : "unknown"}`,
    );
    return;
  }

  if (sub === "rename") {
    const rest = args.slice(1);
    if (rest.length < 2) {
      throw new CliError("Usage: wallclock effort rename <old> <new>", ExitCode.USAGE);
    }
    const newName = rest[rest.length - 1]!;
    const oldName = rest.slice(0, -1).join(" ").trim();
    let effortName = "";
    updateStore(STORE_DIR, (store) => {
      const result = renameEffort(store, oldName, newName);
      effortName = result.effort.name;
      return result.store;
    });
    console.log(`Renamed effort to "${effortName}"`);
    return;
  }

  if (sub === "archive" || sub === "unarchive") {
    const name = args.slice(1).join(" ").trim();
    if (!name) throw new CliError(`Usage: wallclock effort ${sub} <name>`, ExitCode.USAGE);
    let effortName = "";
    updateStore(STORE_DIR, (store) => {
      const result = archiveEffort(store, name, sub === "archive");
      effortName = result.effort.name;
      return result.store;
    });
    console.log(
      sub === "archive"
        ? `Archived effort "${effortName}"`
        : `Unarchived effort "${effortName}"`,
    );
    return;
  }

  if (sub === "delete") {
    const confirm = takeFlag(args, "--confirm");
    const name = args.slice(1).join(" ").trim();
    if (!name) {
      throw new CliError("Usage: wallclock effort delete <name> --confirm", ExitCode.USAGE);
    }
    if (!confirm) {
      throw new CliError(
        `Refusing to delete without --confirm. Usage: wallclock effort delete ${name} --confirm`,
        ExitCode.USAGE,
      );
    }
    let effortName = "";
    updateStore(STORE_DIR, (store) => {
      const result = deleteEffort(store, name);
      effortName = result.deleted.name;
      return result.store;
    });
    console.log(`Deleted effort "${effortName}" and its sessions`);
    return;
  }

  if (sub === "log") {
    if (args.length < 3) {
      throw new CliError("Usage: wallclock effort log <name...> <duration>", ExitCode.USAGE);
    }
    const dur = args[args.length - 1]!;
    const name = args.slice(1, -1).join(" ").trim();
    if (!name) throw new CliError("Usage: wallclock effort log <name...> <duration>", ExitCode.USAGE);
    const ms = parseDuration(dur);
    let effortName = "";
    let totalMs = 0;
    updateStore(STORE_DIR, (store) => {
      const result = logManualDuration(store, name, ms);
      effortName = result.effort.name;
      totalMs = result.effort.totalMs;
      return result.store;
    });
    console.log(
      `Logged ${formatDuration(ms)} on "${effortName}". Total=${formatDuration(totalMs)}`,
    );
    return;
  }

  throw new CliError(`Unknown effort subcommand: ${sub}`, ExitCode.USAGE);
}

function cmdSession(args: string[]): void {
  const sub = args[0];
  if (sub === "start") {
    const force = takeFlag(args, "--force");
    const effort = args.slice(1).join(" ").trim() || undefined;
    let effortName = "";
    let sessionId = "";
    let forced = false;
    updateStore(STORE_DIR, (store) => {
      const result = startSession(store, effort, new Date(), { force });
      effortName = result.effort.name;
      sessionId = result.session.id;
      forced = Boolean(result.forcedEnd);
      return result.store;
    });
    if (forced) {
      console.log(`Ended previous open session (force).`);
    }
    console.log(`Session open on "${effortName}" (${sessionId})`);
    return;
  }
  if (sub === "end") {
    let durationMs = 0;
    let effortName = "";
    let totalMs = 0;
    updateStore(STORE_DIR, (store) => {
      const result = endSession(store);
      durationMs = result.durationMs;
      effortName = result.effort.name;
      totalMs = result.effort.totalMs;
      return result.store;
    });
    console.log(
      `Session closed. Duration=${formatDuration(durationMs)}. Effort "${effortName}" total=${formatDuration(totalMs)}`,
    );
    return;
  }
  if (sub === "status") {
    const store = loadStore(STORE_DIR);
    const st = sessionStatus(store);
    if (!st.session) {
      console.log("No open session.");
      return;
    }
    console.log(`Status:     open`);
    console.log(`Id:         ${st.session.id}`);
    console.log(`Effort:     ${st.effort?.name ?? "unknown"}`);
    console.log(`Started:    ${st.session.startedAt} (UTC)`);
    console.log(`Age:        ${formatDuration(st.ageMs)} (${st.ageMs ?? 0} ms)`);
    const cfg = loadConfig();
    if (st.ageMs != null && st.ageMs >= cfg.openSessionWarnAfterMs) {
      console.log(
        `Warning:    older than ${formatDuration(cfg.openSessionWarnAfterMs)}`,
      );
    }
    if (st.ageMs != null && st.ageMs >= cfg.openSessionSoftCapMs) {
      console.log(
        `Soft cap:   exceeded ${formatDuration(cfg.openSessionSoftCapMs)}`,
      );
    }
    return;
  }
  throw new CliError(
    "Usage: wallclock session start [effort] [--force] | end | status",
    ExitCode.USAGE,
  );
}

function cmdTimeline(args: string[]): void {
  const asJson = takeFlag(args, "--json");
  const effortFilter = takeOption(args, "--effort");
  const cfg = loadConfig();
  const limitRaw = args[0];
  const limit = limitRaw ? Number(limitRaw) : cfg.timelineDefaultLimit;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new CliError("timeline limit must be a positive number", ExitCode.USAGE);
  }
  const store = loadStore(STORE_DIR);
  if (store.sessions.length >= cfg.hugeStoreSessionWarn) {
    console.error(
      `warning: store has ${store.sessions.length} sessions; showing ${limit} (set AGENT_WALLCLOCK_TIMELINE_LIMIT or pass an explicit limit)`,
    );
  }
  const rows = timeline(store, { limit, effortName: effortFilter });
  if (asJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (rows.length === 0) {
    console.log("No sessions yet.");
    return;
  }
  for (const row of rows) {
    const dur = row.durationMs != null ? formatDuration(row.durationMs) : "unknown";
    const state = row.endedAt ? "closed" : paint("open", "32");
    console.log(
      `${row.startedAt} (UTC)  ${row.effortName}  ${dur}  ${state}`,
    );
  }
}

function cmdStore(args: string[]): void {
  const sub = args[0];
  if (sub === "backup") {
    const dest = args[1];
    const path = backupStore(STORE_DIR, dest);
    console.log(`Backup written to ${path}`);
    return;
  }
  if (sub === "restore") {
    const path = args[1];
    if (!path) throw new CliError("Usage: wallclock store restore <path>", ExitCode.USAGE);
    const store = restoreStore(path, STORE_DIR);
    console.log(
      `Restored store from ${path} (${store.efforts.length} efforts, ${store.sessions.length} sessions)`,
    );
    return;
  }
  throw new CliError("Usage: wallclock store backup [path] | restore <path>", ExitCode.USAGE);
}

function cmdDoctor(args: string[]): void {
  const repair = takeFlag(args, "--repair");
  const result = runDoctor({
    storeDir: STORE_DIR,
    mcpServerPath: mcpServerPath(),
    cliBinPath: cliBinPath(),
    repair,
  });
  for (const check of result.checks) {
    const mark = check.ok ? paint("ok", "32") : paint("FAIL", "31");
    console.log(`[${mark}] ${check.id}: ${check.message}`);
  }
  if (!result.ok) {
    throw new CliError("Doctor found problems. See above.", ExitCode.STORE);
  }
  console.log("Doctor OK");
}

function cmdWhere(): void {
  const server = mcpServerPath();
  console.log(`store_dir:     ${STORE_DIR}`);
  console.log(`store_file:    ${join(STORE_DIR, "store.json")}`);
  console.log(`mcp_server:    ${server}`);
  console.log(`mcp_exists:    ${existsSync(server) ? "yes" : "no"}`);
  console.log(`cli_bin:       ${cliBinPath()}`);
  console.log(`version:       ${packageVersion()}`);
}

function cmdMcpConfig(args: string[]): void {
  const print = takeFlag(args, "--print");
  const check = takeFlag(args, "--check");
  const host = args.find((a) => a === "claude" || a === "cursor" || a === "vscode");
  if (!print || !host) {
    throw new CliError(
      "Usage: wallclock mcp-config --print <claude|cursor|vscode> [--check]",
      ExitCode.USAGE,
    );
  }
  const server = mcpServerPath();
  if (check || !existsSync(server)) {
    if (!existsSync(server)) {
      throw new CliError(
        `MCP server build not found at ${server}. Run \`npm run build\` from the repo root first.`,
        ExitCode.NOT_FOUND,
      );
    }
  }

  const env: Record<string, string> = {
    AGENT_WALLCLOCK_WRITES: "0",
  };

  let config: unknown;
  if (host === "vscode") {
    // VS Code / Copilot MCP uses mcp.json servers map (same shape family as Cursor).
    config = {
      servers: {
        "agent-wallclock": {
          type: "stdio",
          command: "node",
          args: [server],
          env,
        },
      },
    };
  } else {
    config = {
      mcpServers: {
        "agent-wallclock": {
          command: "node",
          args: [server],
          env,
        },
      },
    };
  }

  console.log(JSON.stringify(config, null, 2));
  console.error("");
  console.error(`# Host: ${host}`);
  console.error(`# Server: ${server}`);
  console.error("# Writes default off. Set AGENT_WALLCLOCK_WRITES=1 in env to enable mutations.");
  if (check) {
    console.error("# --check: server file exists");
  }
}

function cmdInit(): void {
  const store = initStore(STORE_DIR);
  console.log(`Store ready at ${STORE_DIR}`);
  console.log(`Efforts: ${store.efforts.length}; sessions: ${store.sessions.length}`);
  console.log("");

  const doctor = runDoctor({
    storeDir: STORE_DIR,
    mcpServerPath: mcpServerPath(),
    cliBinPath: cliBinPath(),
  });
  for (const check of doctor.checks) {
    const mark = check.ok ? "ok" : "FAIL";
    console.log(`[${mark}] ${check.id}: ${check.message}`);
  }
  console.log("");
  console.log("Next:");
  console.log("  1. wallclock effort start <name>");
  console.log("  2. wallclock session start");
  console.log("  3. wallclock brief");
  console.log("  4. wallclock mcp-config --print cursor --check");
  console.log("  5. wallclock doctor");
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

function cmdCircadian(args: string[]): void {
  const action = args[0];
  if (action === "on") {
    savePrefs({ circadianEnabled: true }, STORE_DIR);
    console.log("circadian: on");
    return;
  }
  if (action === "off") {
    savePrefs({ circadianEnabled: false }, STORE_DIR);
    console.log("circadian: off");
    return;
  }
  if (action === "status") {
    const enabled = loadPrefs(STORE_DIR).circadianEnabled;
    console.log(`circadian: ${enabled ? "on" : "off"}`);
    if (enabled) {
      const ctx = classifyCircadian();
      console.log(`band: ${ctx.band}`);
      console.log(`day: ${ctx.dayKind}`);
      console.log(`local hour: ${String(ctx.localHour).padStart(2, "0")}`);
    }
    return;
  }
  throw new CliError("Usage: wallclock circadian on|off|status", ExitCode.USAGE);
}

function cmdCompletion(args: string[]): void {
  const shell = args[0];
  if (shell === "bash") {
    console.log(`# wallclock bash completion
_wallclock() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local cmds="now brief circadian effort session timeline store doctor where mcp-config init completion help"
  local effort_subs="start list status log rename archive unarchive delete"
  local session_subs="start end status"
  local store_subs="backup restore"
  local circadian_subs="on off status"
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\$cmds" -- "\$cur") )
  elif [[ \${COMP_WORDS[1]} == effort && \${COMP_CWORD} -eq 2 ]]; then
    COMPREPLY=( $(compgen -W "\$effort_subs" -- "\$cur") )
  elif [[ \${COMP_WORDS[1]} == session && \${COMP_CWORD} -eq 2 ]]; then
    COMPREPLY=( $(compgen -W "\$session_subs" -- "\$cur") )
  elif [[ \${COMP_WORDS[1]} == store && \${COMP_CWORD} -eq 2 ]]; then
    COMPREPLY=( $(compgen -W "\$store_subs" -- "\$cur") )
  elif [[ \${COMP_WORDS[1]} == circadian && \${COMP_CWORD} -eq 2 ]]; then
    COMPREPLY=( $(compgen -W "\$circadian_subs" -- "\$cur") )
  elif [[ \${COMP_WORDS[1]} == mcp-config ]]; then
    COMPREPLY=( $(compgen -W "--print --check claude cursor vscode" -- "\$cur") )
  elif [[ \${COMP_WORDS[1]} == completion ]]; then
    COMPREPLY=( $(compgen -W "bash zsh" -- "\$cur") )
  fi
}
complete -F _wallclock wallclock
`);
    return;
  }
  if (shell === "zsh") {
    console.log(`#compdef wallclock
_wallclock() {
  local -a cmds
  cmds=(now brief circadian effort session timeline store doctor where mcp-config init completion help)
  _arguments '1:command:(\${cmds})' '*::arg:->args'
  case \$words[1] in
    effort) _values 'effort' start list status log rename archive unarchive delete ;;
    session) _values 'session' start end status ;;
    store) _values 'store' backup restore ;;
    circadian) _values 'circadian' on off status ;;
    mcp-config) _values 'mcp' --print --check claude cursor vscode ;;
    completion) _values 'shell' bash zsh ;;
  esac
}
compdef _wallclock wallclock
`);
    return;
  }
  throw new CliError("Usage: wallclock completion bash|zsh", ExitCode.USAGE);
}

function ensureDistPresent(): void {
  if (!existsSync(cliBinPath())) {
    console.error(
      `wallclock build missing at ${cliBinPath()}. From the repo root run: npm run build`,
    );
    process.exit(ExitCode.NOT_FOUND);
  }
}

function main(argv: string[]): void {
  ensureDistPresent();
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
    printHelp();
    return;
  }
  if (cmd === "--version" || cmd === "-V" || cmd === "version") {
    console.log(packageVersion());
    return;
  }

  switch (cmd) {
    case "now":
      cmdNow();
      break;
    case "brief":
      cmdBrief(rest);
      break;
    case "circadian":
      cmdCircadian(rest);
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
    case "store":
      cmdStore(rest);
      break;
    case "doctor":
      cmdDoctor(rest);
      break;
    case "where":
      cmdWhere();
      break;
    case "mcp-config":
      cmdMcpConfig(rest);
      break;
    case "init":
      cmdInit();
      break;
    case "completion":
      cmdCompletion(rest);
      break;
    default:
      throw new CliError(`Unknown command: ${cmd}`, ExitCode.USAGE);
  }
}

try {
  main(process.argv.slice(2));
} catch (err) {
  const { message, exitCode } = classifyError(err);
  console.error(message);
  process.exitCode = exitCode;
}
