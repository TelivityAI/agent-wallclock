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
const home = mkdtempSync(join(tmpdir(), "wallclock-mcp-smoke-"));
process.env.AGENT_WALLCLOCK_HOME = home;

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
        } catch (err) {
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

async function mcpProtocolSmoke() {
  const serverPath = join(root, "packages/mcp/dist/server.js");
  if (!existsSync(serverPath)) {
    throw new Error("MCP server build missing");
  }

  const proc = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      AGENT_WALLCLOCK_HOME: home,
      // writes off by default — exercise read tools
      AGENT_WALLCLOCK_WRITES: "0",
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

    send(proc, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    send(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
    const [toolsResp] = await readMessages(proc, 1);
    const names = (toolsResp.result?.tools ?? []).map((t) => t.name);
    for (const required of ["get_now", "get_briefing", "list_efforts", "start_effort", "log_session"]) {
      if (!names.includes(required)) {
        throw new Error(`tools/list missing ${required}`);
      }
    }

    send(proc, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "get_now", arguments: {} },
    });
    const [nowResp] = await readMessages(proc, 1);
    const nowText = nowResp.result?.content?.[0]?.text ?? "";
    if (!nowText.includes("local_date=")) {
      throw new Error(`get_now unexpected: ${nowText}`);
    }

    send(proc, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "get_briefing", arguments: {} },
    });
    const [briefResp] = await readMessages(proc, 1);
    const briefText = briefResp.result?.content?.[0]?.text ?? "";
    if (!briefText.includes("Temporal Briefing") || !briefText.includes("Generated at:")) {
      throw new Error(`get_briefing unexpected: ${briefText.slice(0, 200)}`);
    }

    send(proc, {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "start_effort", arguments: { name: "should-fail" } },
    });
    const [writeResp] = await readMessages(proc, 1);
    const writeText =
      writeResp.result?.content?.[0]?.text ??
      writeResp.error?.message ??
      JSON.stringify(writeResp);
    if (!/AGENT_WALLCLOCK_WRITES|disabled|writes/i.test(writeText)) {
      // MCP SDK may wrap tool errors as isError content
      const isError = writeResp.result?.isError;
      if (!isError && !/AGENT_WALLCLOCK_WRITES|disabled|writes/i.test(JSON.stringify(writeResp))) {
        throw new Error(`expected writes-disabled error, got: ${writeText}`);
      }
    }

    console.log("MCP stdio protocol smoke OK");
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

  const serverPath = new URL("../packages/mcp/dist/server.js", import.meta.url);
  if (!existsSync(serverPath)) {
    throw new Error("MCP server build missing");
  }

  // Import without starting stdio (server guards on direct-run).
  await import(serverPath.href);

  console.log("MCP/core tool-path smoke OK");
  console.log(`default store helper: ${getDefaultStoreDir() ? "ok" : "missing"}`);

  await mcpProtocolSmoke();
} finally {
  rmSync(home, { recursive: true, force: true });
}
