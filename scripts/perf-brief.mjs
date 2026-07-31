#!/usr/bin/env node
/**
 * Benchmark briefing generation on a large synthetic session history.
 */
import { performance } from "node:perf_hooks";
import { renderBriefing } from "../packages/core/dist/index.js";

const SESSION_COUNT = Number(process.env.PERF_SESSION_COUNT ?? "2000");

function syntheticStore(sessionCount) {
  const effortId = "eff-perf";
  const baseMs = Date.UTC(2026, 0, 1);
  const efforts = [
    {
      id: effortId,
      name: "perf-effort",
      startedAt: new Date(baseMs).toISOString(),
      totalMs: sessionCount * 3_600_000,
      sessionCount,
      lastActivityAt: new Date(baseMs + sessionCount * 3_600_000).toISOString(),
    },
  ];
  const sessions = [];
  for (let i = 0; i < sessionCount; i++) {
    const start = baseMs + i * 3_600_000;
    sessions.push({
      id: `sess-${i}`,
      effortId,
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(start + 1_800_000).toISOString(),
    });
  }
  return {
    version: 1,
    efforts,
    sessions,
    activeSessionId: null,
    activeEffortId: effortId,
  };
}

const store = syntheticStore(SESSION_COUNT);
const start = performance.now();
const text = renderBriefing(store);
const ms = performance.now() - start;

console.log(`brief generation (${SESSION_COUNT} sessions): ${ms.toFixed(2)} ms`);
console.log(`output length: ${text.length} chars`);
