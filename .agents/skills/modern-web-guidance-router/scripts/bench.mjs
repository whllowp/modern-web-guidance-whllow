#!/usr/bin/env node
/**
 * bench.mjs — measure the router's real CLI efficiency.
 *
 * Metrics (all measured, no synthetic scoring):
 *   - per-query wall time of a real `node mwg.mjs search ... --json` spawn:
 *     mean / p50 / p95 / min / max
 *   - top-1 / top-3 accuracy over references/selftest-cases.json
 *   - index size, index build time, node startup overhead, per-query output bytes
 *
 * Usage:
 *   node scripts/bench.mjs [--label baseline] [--out ../../../../docs/bench/router-baseline.json]
 *                          [--runs 1] [--warm 3] [--limit 3]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..');
const INDEX = path.join(SKILL_DIR, 'references', 'index.json');
const CASES = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'references', 'selftest-cases.json'), 'utf8'));
const MWG = path.join(SCRIPT_DIR, 'mwg.mjs');
const BUILD = path.join(SCRIPT_DIR, 'build-index.mjs');

const argv = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const label = getArg('--label', 'unlabeled');
const outFile = getArg('--out', null);
const RUNS = Number(getArg('--runs', '1'));
const WARM = Number(getArg('--warm', '3'));
const LIMIT = Number(getArg('--limit', '3'));

function runNode(args, input = null) {
  const started = process.hrtime.bigint();
  const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', input });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  return { stdout, ms };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

// Warm the OS file cache.
for (let i = 0; i < WARM; i += 1) runNode([MWG, 'stats']);

// Node startup overhead (empty script), 5 samples.
const startup = [];
for (let i = 0; i < 5; i += 1) startup.push(runNode(['-e', '']).ms);
startup.sort((a, b) => a - b);

// Index build time: rebuild to a temp copy is not possible without touching the file;
// measure `build-index --check` instead (parses + fingerprints without writing).
const buildCheck = runNode([BUILD, '--check']);

const latencies = [];
const outputChars = [];
let top1 = 0;
let top3 = 0;
let errors = 0;
const misses = [];

for (let run = 0; run < RUNS; run += 1) {
  for (const [query, expected] of CASES) {
    let parsed = null;
    let chars = 0;
    let ms = 0;
    try {
      const result = runNode([MWG, 'search', query, '--json', '--limit', String(Math.max(LIMIT, 3))]);
      ms = result.ms;
      chars = result.stdout.length;
      parsed = JSON.parse(result.stdout);
    } catch {
      errors += 1;
      continue;
    }
    const ids = parsed.results.map((r) => r.id);
    if (expected.includes(ids[0])) top1 += 1;
    if (expected.some((id) => ids.includes(id))) top3 += 1;
    else misses.push({ query, got: ids.slice(0, 3), expected });
    latencies.push(ms);
    outputChars.push(chars);
  }
}

latencies.sort((a, b) => a - b);
outputChars.sort((a, b) => a - b);
const total = CASES.length * RUNS;
const indexBytes = fs.statSync(INDEX).size;

// --- locate-flow benchmark: two-process search+retrieve vs one-process brief ---
const FLOW_CASES = [
  'light dismiss dialog',
  '暗色模式',
  'form validation timing',
  '响应式表格',
  'passkey authentication'
];
const flowBaseline = [];
const flowBrief = [];
const flowBaselineChars = [];
const flowBriefChars = [];
const flowBaselineOverhead = [];
const flowBriefOverhead = [];
for (const query of FLOW_CASES) {
  const searchResult = runNode([MWG, 'search', query, '--json', '--limit', '1']);
  const id = JSON.parse(searchResult.stdout).results[0].id;
  const retrieve = runNode([MWG, 'retrieve', id]);
  flowBaseline.push(searchResult.ms + retrieve.ms);
  flowBaselineChars.push(searchResult.stdout.length + retrieve.stdout.length);
  flowBaselineOverhead.push(searchResult.stdout.length);
  const briefResult = runNode([MWG, 'brief', query]);
  flowBrief.push(briefResult.ms);
  flowBriefChars.push(briefResult.stdout.length);
  const marker = briefResult.stdout.indexOf('===== ');
  flowBriefOverhead.push(marker > 0 ? marker : briefResult.stdout.length);
}
const mean = (values) => Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
const flowBaselineMean = mean(flowBaseline);
const flowBriefMean = mean(flowBrief);
const flowSpeedup = Math.round((flowBaselineMean / flowBriefMean) * 100) / 100;
const flowOverheadSaving = Math.round((1 - flowBriefChars.reduce((a, b) => a + b, 0) / flowBaselineChars.reduce((a, b) => a + b, 0)) * 1000) / 10;
const overheadBaseline = mean(flowBaselineOverhead);
const overheadBrief = mean(flowBriefOverhead);
const overheadReduction = Math.round((1 - overheadBrief / overheadBaseline) * 1000) / 10;
const humanOutChars = [];
for (const query of FLOW_CASES) humanOutChars.push(runNode([MWG, 'search', query]).stdout.length);
const humanOutMean = Math.round(humanOutChars.reduce((a, b) => a + b, 0) / humanOutChars.length);

const report = {
  label,
  generatedAt: new Date().toISOString(),
  cases: total,
  runs: RUNS,
  limit: LIMIT,
  latencyMs: {
    mean: Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10,
    p50: Math.round(percentile(latencies, 50) * 10) / 10,
    p95: Math.round(percentile(latencies, 95) * 10) / 10,
    min: Math.round(latencies[0] * 10) / 10,
    max: Math.round(latencies[latencies.length - 1] * 10) / 10
  },
  nodeStartupMs: Math.round(percentile(startup, 50) * 10) / 10,
  buildCheckMs: Math.round(buildCheck.ms * 10) / 10,
  top1: Math.round((top1 / total) * 10000) / 100,
  top3: Math.round((top3 / total) * 10000) / 100,
  errors,
  outputChars: {
    mean: Math.round(outputChars.reduce((a, b) => a + b, 0) / outputChars.length),
    p95: Math.round(percentile(outputChars, 95))
  },
  indexBytes,
  indexMB: Math.round((indexBytes / 1024 / 1024) * 100) / 100,
  flow: {
    cases: FLOW_CASES.length,
    searchRetrieveMeanMs: flowBaselineMean,
    briefMeanMs: flowBriefMean,
    speedup: flowSpeedup,
    searchRetrieveChars: Math.round(mean(flowBaselineChars)),
    briefChars: Math.round(mean(flowBriefChars)),
    overheadCharsSavedPercent: flowOverheadSaving,
    routingOverhead: {
      searchRetrieveChars: overheadBaseline,
      briefChars: overheadBrief,
      reductionPercent: overheadReduction
    },
    humanSearchOutputChars: humanOutMean
  },
  misses: misses.slice(0, 20)
};

const line = `[${label}] latency mean=${report.latencyMs.mean}ms p50=${report.latencyMs.p50}ms p95=${report.latencyMs.p95}ms | top1=${report.top1}% top3=${report.top3}% | index=${report.indexMB}MB | outChars mean=${report.outputChars.mean} | flow: search+retrieve=${flowBaselineMean}ms → brief=${flowBriefMean}ms (${flowSpeedup}x) | startup=${report.nodeStartupMs}ms | buildCheck=${report.buildCheckMs}ms`;
console.log(line);
if (misses.length) console.log(`  misses: ${misses.slice(0, 6).map((m) => m.query).join(' | ')}`);
if (outFile) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`  written: ${outFile}`);
}
