import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { initStore, loadStore, saveStore, emptyStore, getStoreFilePath } from "./store.js";
import { startEffort } from "./effort.js";

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
});
