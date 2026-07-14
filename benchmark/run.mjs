#!/usr/bin/env node
/**
 * Measured throughput for a single-Node TypeScript generator.
 * Spec / README "1,024 ID/ms" figures are formal capacity — not this bench.
 */
import { OrbitGenerator } from "@orbit-id/core";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

const durationMs = Number(arg("--duration-ms", "2000"));
const warmupMs = Number(arg("--warmup-ms", "500"));
const nodeId = Number(arg("--node", "1"));
const type = Number(arg("--type", "1"));

const generator = new OrbitGenerator({ node: nodeId });

function runFor(ms) {
  const end = performance.now() + ms;
  let count = 0;
  while (performance.now() < end) {
    generator.generate(type);
    count += 1;
  }
  return count;
}

runFor(warmupMs);
const start = performance.now();
const issued = runFor(durationMs);
const elapsedMs = performance.now() - start;
const idsPerSec = (issued / elapsedMs) * 1000;
const idsPerMs = issued / elapsedMs;

const report = {
  formalCapacityIdsPerMs: 1024,
  note: "Measured results below are environmental; do not treat as spec guarantees.",
  node: nodeId,
  type,
  warmupMs,
  durationMs: Number(elapsedMs.toFixed(2)),
  issued,
  measuredIdsPerMs: Number(idsPerMs.toFixed(2)),
  measuredIdsPerSec: Math.round(idsPerSec),
};

console.log(JSON.stringify(report, null, 2));
