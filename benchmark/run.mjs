#!/usr/bin/env node
/**
 * Measured throughput for a single-Node TypeScript generator.
 * Spec / README "1,024 ID/ms" (v1) / formal v2 capacity figures are not this bench.
 */
import { OrbitGenerator, v2 } from "@orbit-id/core";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

const idVersion = String(arg("--id-version", "1"));
const durationMs = Number(arg("--duration-ms", "2000"));
const warmupMs = Number(arg("--warmup-ms", "500"));
const nodeId = Number(arg("--node", "1"));
const type = Number(arg("--type", "1"));

if (idVersion !== "1" && idVersion !== "2") {
  console.error(`Unknown --id-version ${idVersion}; use 1 or 2`);
  process.exit(1);
}

const generator =
  idVersion === "2"
    ? new v2.OrbitGeneratorV2({ node: nodeId })
    : new OrbitGenerator({ node: nodeId });

const formalCapacityIdsPerMs = idVersion === "2" ? 65_536 : 1_024;

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
  idVersion: Number(idVersion),
  formalCapacityIdsPerMs,
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
