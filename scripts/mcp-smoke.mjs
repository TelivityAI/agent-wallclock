import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

const home = mkdtempSync(join(tmpdir(), "wallclock-mcp-smoke-"));
process.env.AGENT_WALLCLOCK_HOME = home;

try {
  initStore(home);
  let store = loadStore(home);
  ({ store } = startEffort(store, "docs-pass"));
  saveStore(store, home);
  ({ store } = startSession(store));
  saveStore(store, home);

  const briefing = renderBriefing(store);
  if (!briefing.includes("docs-pass")) throw new Error("briefing missing effort");
  if (!getNow().localDate) throw new Error("get_now failed");
  if (listEfforts(store).length !== 1) throw new Error("list_efforts failed");

  const ended = endSession(store);
  store = ended.store;
  saveStore(store, home);

  ({ store } = logManualDuration(store, "docs-pass", 60_000));
  saveStore(store, home);

  const { existsSync } = await import("node:fs");
  const serverPath = new URL("../packages/mcp/dist/server.js", import.meta.url);
  if (!existsSync(serverPath)) {
    throw new Error("MCP server build missing");
  }

  // Import without starting stdio (server guards on direct-run).
  await import(serverPath.href);

  console.log("MCP/core tool-path smoke OK");
  console.log(`default store helper: ${getDefaultStoreDir() ? "ok" : "missing"}`);
} finally {
  rmSync(home, { recursive: true, force: true });
}
