#!/usr/bin/env node
/**
 * bench-verify.mjs — 可复现的 verify.mjs 性能基准（零依赖）。
 *
 * 对同一个页面重复执行 `verify.mjs run`，测量墙钟时间、退出码、report.json 体积、
 * stdout 体积与截图数量，输出 mean / p50 / p95 / min / max。用于对比优化前后
 * （同一台机器、同一夹具、同一命令）——不替代功能验收。
 *
 * 用法：
 *   node scripts/bench-verify.mjs --url <http|file url> [--runs 3]
 *        [--checks checks.json] [--quick] [--concurrency 3]
 *        [--viewports "360x800,768x1024,1440x900"] [--theme "light,dark"]
 *        [--label baseline] [--out <dir>] [--json]
 *
 * 退出码：0 = 基准完成；2 = 参数/环境错误。被测 run 的 FAIL 不改变基准退出码。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const VERIFY = path.join(SCRIPT_DIR, 'verify.mjs');

function usage(message) {
  if (message) console.error(`bench-verify: ${message}`);
  console.error(
    'usage: node scripts/bench-verify.mjs --url <url> [--runs 3] [--checks file] [--quick] [--concurrency 3] [--viewports ...] [--theme ...] [--verify <脚本路径>] [--label name] [--out dir] [--json]',
  );
  process.exit(2);
}

const argv = process.argv.slice(2);
const opts = { runs: 3 };
for (let i = 0; i < argv.length; i += 1) {
  const token = argv[i];
  if (!token.startsWith('--')) usage(`无法识别的参数: ${token}`);
  const eq = token.indexOf('=');
  const key = eq === -1 ? token.slice(2) : token.slice(2, eq);
  const inline = eq === -1 ? null : token.slice(eq + 1);
  if (['quick', 'json'].includes(key)) {
    opts[key] = true;
    continue;
  }
  const value = inline !== null ? inline : argv[++i];
  if (value === undefined) usage(`--${key} 需要一个值`);
  opts[key] = value;
}
if (!opts.url) usage('缺少 --url');
const runs = Number(opts.runs);
if (!Number.isInteger(runs) || runs < 1 || runs > 20) usage('--runs 需为 1-20 的整数');

const formatClick = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`);

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const pick = (q) => {
    if (sorted.length === 1) return sorted[0];
    const pos = (sorted.length - 1) * q;
    const low = Math.floor(pos);
    const high = Math.ceil(pos);
    return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
  };
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, p50: pick(0.5), p95: pick(0.95), min: sorted[0], max: sorted[sorted.length - 1], stddev: Math.sqrt(variance) };
}

const label = String(opts.label || (opts.quick ? 'quick' : 'baseline')).replace(/[^a-zA-Z0-9_-]+/g, '-');
const outRoot = path.resolve(opts.out || path.join(os.tmpdir(), 'fe-verify-bench', `${label}-${Date.now()}`));
fs.mkdirSync(outRoot, { recursive: true });

// --verify 允许对同一夹具跑旧版本脚本（A/B 对比），默认用同目录的 verify.mjs。
const verifyPath = opts.verify ? path.resolve(opts.verify) : VERIFY;
if (!fs.existsSync(verifyPath)) usage(`--verify 指向的脚本不存在: ${verifyPath}`);
const baseArgs = [verifyPath, 'run', '--url', opts.url, '--no-fail'];
if (opts.checks) baseArgs.push('--checks', path.resolve(opts.checks));
if (opts.quick) baseArgs.push('--quick');
if (opts.concurrency) baseArgs.push('--concurrency', String(opts.concurrency));
if (opts.viewports) baseArgs.push('--viewports', opts.viewports);
if (opts.theme) baseArgs.push('--theme', opts.theme);

const rows = [];
for (let i = 0; i < runs; i += 1) {
  const outDir = path.join(outRoot, `run-${i + 1}`);
  const args = [...baseArgs, '--out', outDir];
  const started = process.hrtime.bigint();
  const child = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    timeout: 300000,
    windowsHide: true,
    env: { ...process.env, NO_COLOR: '1' },
  });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  const exitCode = child.status === null ? -1 : child.status;
  const stdout = child.stdout || '';
  const stderr = child.stderr || '';
  const reportPath = path.join(outDir, 'report.json');
  let report = null;
  if (fs.existsSync(reportPath)) {
    try {
      report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch {
      report = null;
    }
  }
  rows.push({
    run: i + 1,
    elapsedMs,
    exitCode,
    verdict: report ? report.verdict : '(no report)',
    mode: report ? report.mode || 'full' : '-',
    screenshots: report && report.artifacts ? report.artifacts.screenshots.length : 0,
    reportBytes: fs.existsSync(reportPath) ? fs.statSync(reportPath).size : 0,
    stdoutBytes: Buffer.byteLength(stdout, 'utf8'),
    stderrBytes: Buffer.byteLength(stderr, 'utf8'),
    outDir,
  });
  process.stderr.write(`bench-verify: run ${i + 1}/${runs} ${formatClick(elapsedMs)} exit=${exitCode} verdict=${rows[i].verdict}\n`);
}

const time = stats(rows.map((row) => row.elapsedMs));
const reportBytes = stats(rows.map((row) => row.reportBytes));
const stdoutBytes = stats(rows.map((row) => row.stdoutBytes));
const screenshots = rows[0] ? rows[0].screenshots : 0;

const result = {
  tool: 'bench-verify',
  label,
  url: opts.url,
  args: baseArgs.slice(2),
  runs: rows.map(({ outDir, ...row }) => ({ ...row, reportBytes: row.reportBytes, stdoutBytes: row.stdoutBytes })),
  wallMs: {
    mean: Math.round(time.mean * 10) / 10,
    p50: Math.round(time.p50 * 10) / 10,
    p95: Math.round(time.p95 * 10) / 10,
    min: Math.round(time.min * 10) / 10,
    max: Math.round(time.max * 10) / 10,
    stddev: Math.round(time.stddev * 10) / 10,
  },
  reportBytesMean: Math.round(reportBytes.mean),
  stdoutBytesMean: Math.round(stdoutBytes.mean),
  screenshotsPerRun: screenshots,
};

if (opts.json) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  console.log(`\n== bench-verify · ${label} ==`);
  console.log(`url        : ${opts.url}`);
  console.log(`args       : ${baseArgs.slice(2).join(' ')}`);
  console.log(`runs       : ${runs} · mode=${rows[0] ? rows[0].mode : '-'} · screenshots/run=${screenshots}`);
  console.log(`wall(ms)   : mean=${result.wallMs.mean}  p50=${result.wallMs.p50}  p95=${result.wallMs.p95}  min=${result.wallMs.min}  max=${result.wallMs.max}  sd=${result.wallMs.stddev}`);
  console.log(`report.json: mean=${result.reportBytesMean} B`);
  console.log(`stdout     : mean=${result.stdoutBytesMean} B`);
  console.log('\nrun   wall      exit  verdict  shots  reportB  stdoutB');
  for (const row of rows) {
    console.log(
      `${String(row.run).padEnd(4)}  ${formatClick(row.elapsedMs).padEnd(8)}  ${String(row.exitCode).padEnd(4)}  ${String(row.verdict).padEnd(7)}  ${String(row.screenshots).padEnd(5)}  ${String(row.reportBytes).padEnd(8)}  ${row.stdoutBytes}`,
    );
  }
  console.log(`\nout: ${outRoot}`);
}
