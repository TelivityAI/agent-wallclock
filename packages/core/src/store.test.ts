import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import {
  initStore,
  loadStore,
  saveStore,
  emptyStore,
  getStoreFilePath,
  backupStore,
  restoreStore,
  withStoreLock,
  StoreLockError,
  updateStore,
} from "./store.js";
import { startEffort } from "./effort.js";
import { runDoctor } from "./doctor.js";

describe("store", () => {
  const dir = mkdtempSync(join(tmpdir(), "agent-wallclock-"));

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("initializes and round-trips JSON", () => {
    const created = initStore(dir);
    assert.equal(created.version, 1);
    assert.deepEqual(created.efforts, []);

    let store = emptyStore();
    ({ store } = startEffort(store, "auth-rewrite", new Date("2026-01-01T12:00:00.000Z")));
    saveStore(store, dir);

    const loaded = loadStore(dir);
    assert.equal(loaded.efforts.length, 1);
    assert.equal(loaded.efforts[0]?.name, "auth-rewrite");
  });

  it("sets restrictive file permissions when supported", () => {
    if (process.platform === "win32") return;
    const file = getStoreFilePath(dir);
    const st = statSync(file);
    assert.equal(st.mode & 0o777, 0o600);
  });

  it("gives a friendly error for corrupt JSON", () => {
    const badDir = mkdtempSync(join(tmpdir(), "agent-wallclock-bad-"));
    try {
      initStore(badDir);
      writeFileSync(getStoreFilePath(badDir), "{not-json", "utf8");
      assert.throws(() => loadStore(badDir), /Corrupt Agent Wallclock store/);
    } finally {
      rmSync(badDir, { recursive: true, force: true });
    }
  });

  it("repairs corrupt store by quarantine", () => {
    const badDir = mkdtempSync(join(tmpdir(), "agent-wallclock-repair-"));
    try {
      initStore(badDir);
      writeFileSync(getStoreFilePath(badDir), "{not-json", "utf8");
      const repaired = loadStore(badDir, { repair: true });
      assert.equal(repaired.efforts.length, 0);
      assert.ok(existsSync(getStoreFilePath(badDir)));
    } finally {
      rmSync(badDir, { recursive: true, force: true });
    }
  });

  it("backs up and restores", () => {
    const bdir = mkdtempSync(join(tmpdir(), "agent-wallclock-bak-"));
    try {
      let store = emptyStore();
      ({ store } = startEffort(store, "bak", new Date("2026-01-01T12:00:00.000Z")));
      saveStore(store, bdir);
      const dest = backupStore(bdir);
      assert.ok(existsSync(dest));
      saveStore(emptyStore(), bdir);
      const restored = restoreStore(dest, bdir);
      assert.equal(restored.efforts[0]?.name, "bak");
    } finally {
      rmSync(bdir, { recursive: true, force: true });
    }
  });

  it("strict lock throws when held", () => {
    if (process.platform === "win32") return;
    const ldir = mkdtempSync(join(tmpdir(), "agent-wallclock-lock-"));
    try {
      initStore(ldir);
      withStoreLock(ldir, () => {
        assert.throws(
          () =>
            withStoreLock(
              ldir,
              () => "nested",
              { timeoutMs: 50, strict: true },
            ),
          (err: unknown) => err instanceof StoreLockError,
        );
      });
    } finally {
      rmSync(ldir, { recursive: true, force: true });
    }
  });

  it("updateStore mutates under lock", () => {
    const udir = mkdtempSync(join(tmpdir(), "agent-wallclock-upd-"));
    try {
      initStore(udir);
      const next = updateStore(udir, (s) => startEffort(s, "x").store);
      assert.equal(next.efforts[0]?.name, "x");
    } finally {
      rmSync(udir, { recursive: true, force: true });
    }
  });

  it("doctor validates store", () => {
    const ddir = mkdtempSync(join(tmpdir(), "agent-wallclock-doc-"));
    try {
      initStore(ddir);
      const result = runDoctor({ storeDir: ddir });
      assert.ok(result.ok);
      assert.ok(result.checks.some((c) => c.id === "store-load" && c.ok));
    } finally {
      rmSync(ddir, { recursive: true, force: true });
    }
  });
});
