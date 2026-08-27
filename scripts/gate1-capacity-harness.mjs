import { performance } from "node:perf_hooks";

const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const target = new URL(process.env.GATE1_TARGET_URL ?? "http://127.0.0.1:3000/healthz");
const requestCount = Number.parseInt(process.env.GATE1_REQUESTS ?? "40", 10);
const concurrency = Number.parseInt(process.env.GATE1_CONCURRENCY ?? "8", 10);

if (!localHosts.has(target.hostname)) throw new Error("GATE1_TARGET_URL must be a localhost URL; this harness never sends external traffic.");
if (!Number.isInteger(requestCount) || requestCount < 1 || requestCount > 200) throw new Error("GATE1_REQUESTS must be an integer between 1 and 200.");
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) throw new Error("GATE1_CONCURRENCY must be an integer between 1 and 32.");

const latencies = [];
const statuses = new Map();
let cursor = 0;

async function worker() {
  while (cursor < requestCount) {
    cursor += 1;
    const startedAt = performance.now();
    const response = await fetch(target, { headers: { "x-request-id": `gate1_capacity_${crypto.randomUUID().replaceAll("-", "")}` } });
    latencies.push(performance.now() - startedAt);
    statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
    await response.arrayBuffer();
  }
}

const startedAt = new Date().toISOString();
await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, worker));
latencies.sort((left, right) => left - right);
const percentile = percentileValue => latencies[Math.min(latencies.length - 1, Math.max(0, Math.ceil(latencies.length * percentileValue) - 1))];

console.log(JSON.stringify({
  scope: "Local-only health probe against the URL shown; this is not a production scalability, availability, recovery, or SLO result.",
  target: target.toString(),
  startedAt,
  requestCount,
  concurrency,
  statuses: Object.fromEntries(statuses),
  latencyMs: { min: Number(latencies[0].toFixed(2)), p50: Number(percentile(0.5).toFixed(2)), p95: Number(percentile(0.95).toFixed(2)), max: Number(latencies.at(-1).toFixed(2)) },
}));
