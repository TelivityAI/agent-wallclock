import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  getDefaultStoreDir,
  initStore,
  loadStore,
  saveStore,
  startEffort,
  startSession,
  endSession,
  listEfforts,
  renderBriefing,
  getNow,
  logManualDuration,
} from "../packages/core/dist/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const serverPath = join(root, "packages", "mcp", "dist", "server.js");
const home = mkdtempSync(join(tmpdir(), "wallclock-mcp-smoke-"));
process.env.AGENT_WALLCLOCK_HOME = home;

const EXPECTED_TOOLS = [
  "get_now",
  "get_briefing",
  "list_efforts",
  "get_session_status",
  "get_timeline",
  "start_effort",
  "log_session",
];

function send(proc, msg) {
  proc.stdin.write(`${JSON.stringify(msg)}\n`);
}

function readMessages(proc, count, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const messages = [];
    let buffer = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timed out waiting for ${count} MCP messages; got ${messages.length}`));
    }, timeoutMs);

    function onData(chunk) {
      buffer += chunk.toString("utf8");
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          messages.push(JSON.parse(line));
        } catch {
          cleanup();
          reject(new Error(`invalid JSON from MCP: ${line}`));
          return;
        }
        if (messages.length >= count) {
          cleanup();
          resolve(messages);
          return;
        }
      }
    }

    function cleanup() {
      clearTimeout(timer);
      proc.stdout.off("data", onData);
    }

    proc.stdout.on("data", onData);
  });
}

async function callTool(proc, id, name, args = {}) {
  send(proc, {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  });
  const [resp] = await readMessages(proc, 1);
  if (resp.error) {
    throw new Error(`${name} failed: ${JSON.stringify(resp.error)}`);
  }
  return resp.result;
}

async function mcpProtocolSmoke({ writesEnabled = false } = {}) {
  if (!existsSync(serverPath)) {
    throw new Error("MCP server build missing");
  }

  const proc = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      AGENT_WALLCLOCK_HOME: home,
      AGENT_WALLCLOCK_WRITES: writesEnabled ? "1" : "0",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  try {
    send(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "wallclock-mcp-smoke", version: "0.1.0" },
      },
    });
    const [initResp] = await readMessages(proc, 1);
    if (initResp.error) throw new Error(`initialize failed: ${JSON.stringify(initResp.error)}`);
    if (!initResp.result?.serverInfo?.name) {
      throw new Error("initialize missing serverInfo");
    }

    send(proc, { jsonrpc: "2.0", method: "notifications/initialized" });

    send(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
    const [toolsResp] = await readMessages(proc, 1);
    const names = (toolsResp.result?.tools ?? []).map((t) => t.name).sort();
    const expected = [...EXPECTED_TOOLS].sort();
    if (names.length !== expected.length || names.some((n, i) => n !== expected[i])) {
      throw new Error(`tools/list mismatch.\n  got: ${names.join(", ")}\n  expected: ${expected.join(", ")}`);
    }

    const nowResult = await callTool(proc, 3, "get_now");
    const nowText = nowResult?.content?.[0]?.text ?? "";
    if (!nowText.includes("local_date=")) {
      throw new Error(`get_now unexpected: ${nowText}`);
    }

    const briefResult = await callTool(proc, 4, "get_briefing");
    const briefText = briefResult?.content?.[0]?.text ?? "";
    if (!briefText.includes("Temporal Briefing") || !briefText.includes("Generated at:")) {
      throw new Error(`get_briefing unexpected: ${briefText.slice(0, 200)}`);
    }

    const sessionResult = await callTool(proc, 5, "get_session_status");
    const sessionText = sessionResult?.content?.[0]?.text ?? "";
    if (!/status=(open|none)/.test(sessionText)) {
      throw new Error(`get_session_status unexpected: ${sessionText}`);
    }

    const timelineResult = await callTool(proc, 6, "get_timeline", { limit: 5 });
    const timelineText = timelineResult?.content?.[0]?.text ?? "";
    if (!timelineText || timelineText.includes("No sessions")) {
      throw new Error(`get_timeline unexpected: ${timelineText}`);
    }

    if (writesEnabled) {
      const writeOk = await callTool(proc, 7, "start_effort", { name: "mcp-write-test" });
      const writeOkText = writeOk?.content?.[0]?.text ?? "";
      if (writeOk?.isError || !/effort|Created|Selected/i.test(writeOkText)) {
        throw new Error(`start_effort with writes enabled failed: ${writeOkText}`);
      }
    } else {
      send(proc, {
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { name: "start_effort", arguments: { name: "should-fail" } },
      });
      const [writeResp] = await readMessages(proc, 1);
      const writeResult = writeResp.result;
      if (!writeResult?.isError) {
        throw new Error(`expected isError for write-denied start_effort, got: ${JSON.stringify(writeResult)}`);
      }
      const writeText = writeResult?.content?.[0]?.text ?? "";
      if (!/AGENT_WALLCLOCK_WRITES|disabled|writes/i.test(writeText)) {
        throw new Error(`expected writes-disabled message, got: ${writeText}`);
      }
    }

    console.log(`MCP stdio protocol smoke OK (writes=${writesEnabled ? "1" : "0"})`);
  } finally {
    proc.kill("SIGTERM");
  }
}

try {
  initStore(home);
  let store = loadStore(home);
  ({ store } = startEffort(store, "docs-pass"));
  saveStore(store, home);
  ({ store } = startSession(store));
  saveStore(store, home);

  const briefing = renderBriefing(store);
  if (!briefing.includes("docs-pass")) throw new Error("briefing missing effort");
  if (!briefing.includes("Generated at:")) throw new Error("briefing missing freshness");
  if (!getNow().localDate) throw new Error("get_now failed");
  if (listEfforts(store).length !== 1) throw new Error("list_efforts failed");

  const ended = endSession(store);
  store = ended.store;
  saveStore(store, home);

  ({ store } = logManualDuration(store, "docs-pass", 60_000));
  saveStore(store, home);

  if (!existsSync(serverPath)) {
    throw new Error("MCP server build missing");
  }

  await import(new URL(serverPath, import.meta.url).href);

  console.log("MCP/core tool-path smoke OK");
  console.log(`default store helper: ${getDefaultStoreDir() ? "ok" : "missing"}`);

  await mcpProtocolSmoke({ writesEnabled: false });
  await mcpProtocolSmoke({ writesEnabled: true });
} finally {
  rmSync(home, { recursive: true, force: true });
}
