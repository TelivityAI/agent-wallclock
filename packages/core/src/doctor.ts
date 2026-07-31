import { existsSync, statSync } from "node:fs";
import { loadConfig } from "./config.js";
import { loadStore, getStoreFilePath, getDefaultStoreDir } from "./store.js";

export interface DoctorCheck {
  id: string;
  ok: boolean;
  message: string;
}

export interface DoctorResult {
  ok: boolean;
  checks: DoctorCheck[];
}

export interface DoctorOptions {
  storeDir?: string;
  mcpServerPath?: string;
  cliBinPath?: string;
  repair?: boolean;
}

export function runDoctor(opts: DoctorOptions = {}): DoctorResult {
  const storeDir = opts.storeDir ?? getDefaultStoreDir();
  const checks: DoctorCheck[] = [];

  // Store load
  try {
    const store = loadStore(storeDir, { repair: opts.repair });
    checks.push({
      id: "store-load",
      ok: true,
      message: `Store OK at ${storeDir} (v${store.version}, ${store.efforts.length} efforts, ${store.sessions.length} sessions)`,
    });
    const cfg = loadConfig();
    if (store.sessions.length >= cfg.hugeStoreSessionWarn) {
      checks.push({
        id: "store-size",
        ok: true,
        message: `Large store: ${store.sessions.length} sessions (warn threshold ${cfg.hugeStoreSessionWarn}). Timeline defaults to a limited window.`,
      });
    }
  } catch (err) {
    checks.push({
      id: "store-load",
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const storeFile = getStoreFilePath(storeDir);
  if (existsSync(storeFile) && process.platform !== "win32") {
    try {
      const mode = statSync(storeFile).mode & 0o777;
      checks.push({
        id: "store-perms",
        ok: mode === 0o600,
        message:
          mode === 0o600
            ? `Store file mode is 0600`
            : `Store file mode is ${mode.toString(8)} (expected 0600)`,
      });
    } catch (err) {
      checks.push({
        id: "store-perms",
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (opts.cliBinPath) {
    const ok = existsSync(opts.cliBinPath);
    checks.push({
      id: "cli-build",
      ok,
      message: ok
        ? `CLI build present: ${opts.cliBinPath}`
        : `CLI build missing: ${opts.cliBinPath} — run npm run build`,
    });
  }

  if (opts.mcpServerPath) {
    const ok = existsSync(opts.mcpServerPath);
    checks.push({
      id: "mcp-build",
      ok,
      message: ok
        ? `MCP server present: ${opts.mcpServerPath}`
        : `MCP server missing: ${opts.mcpServerPath} — run npm run build`,
    });
  }

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push({
    id: "node-engine",
    ok: nodeMajor >= 20,
    message: `Node ${process.versions.node} (requires >=20)`,
  });

  return {
    ok: checks.every((c) => c.ok),
    checks,
  };
}
