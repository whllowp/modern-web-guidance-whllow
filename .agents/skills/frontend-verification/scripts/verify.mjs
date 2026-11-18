#!/usr/bin/env node
/**
 * frontend-verification / verify.mjs
 *
 * 真实浏览器验收脚本（零 npm 依赖，Node >= 22，ESM）。
 * 用 Playwright 打开真实页面，采集：截图、控制台、可访问性、响应式溢出、性能、键盘焦点、
 * 断言（checks DSL）、基线像素差异，并输出 report.json / report.md。
 *
 * 子命令：
 *   run     一次完成多视口 × 明暗主题截图 + 控制台/异常/请求失败 + a11y + 溢出 + 性能 + 焦点 + checks + baseline
 *   shot    单张截图
 *   a11y    仅可访问性检查
 *   perf    仅输出性能指标 JSON
 *   compare 两张图片像素差异
 *
 * 设计原则：Playwright 从本机已安装位置动态解析；不联网、不安装依赖。
 * 退出码：0 = 通过，1 = 验证失败（有阻断项），2 = 工具/参数错误（含 Playwright 不可用）。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const TOOL_NAME = 'frontend-verification';
const TOOL_VERSION = '1.1.0';
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);

const EXIT = { PASS: 0, FAIL: 1, TOOL: 2 };

/** @typedef {{exitCode:number, hint?:string}} CliErrorShape */
class CliError extends Error {
  constructor(message, exitCode = EXIT.TOOL, hint = '') {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
    this.hint = hint;
  }
}

function usageError(message) {
  return new CliError(message, EXIT.TOOL);
}

function info(...parts) {
  process.stderr.write(`[${TOOL_NAME}] ${parts.join(' ')}\n`);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function round(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function truncate(text, max = 160) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function stampForDir() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const base = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

function defaultOutDir(kind = 'run') {
  return path.join(os.tmpdir(), TOOL_NAME, kind === 'run' ? stampForDir() : `${kind}-${stampForDir()}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeJsonFile(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeTextFile(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text, 'utf8');
}

// ---------------------------------------------------------------------------
// 参数解析
// ---------------------------------------------------------------------------

const BOOLEAN_FLAGS = new Set(['no-fail', 'full-page', 'headed', 'help', 'quick']);

const COMMAND_FLAGS = {
  run: new Set([
    'url', 'out', 'checks', 'baseline', 'viewports', 'theme', 'no-fail', 'browser',
    'headed', 'wait', 'wait-for', 'timeout', 'pixel-threshold', 'channel-threshold', 'help',
    'quick', 'concurrency',
  ]),
  shot: new Set(['url', 'out', 'viewport', 'theme', 'full-page', 'browser', 'headed', 'wait', 'wait-for', 'timeout', 'help']),
  a11y: new Set(['url', 'out', 'viewport', 'theme', 'browser', 'headed', 'wait', 'no-fail', 'timeout', 'help']),
  perf: new Set(['url', 'viewport', 'theme', 'browser', 'headed', 'wait', 'timeout', 'help']),
  compare: new Set(['a', 'b', 'out', 'threshold', 'no-fail', 'help']),
  help: new Set(['help']),
};

function parseArgv(argv, command) {
  const allowed = COMMAND_FLAGS[command] ?? new Set();
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      const key = eq === -1 ? token.slice(2) : token.slice(2, eq);
      if (!key) throw usageError('空的 -- 参数。');
      if (!allowed.has(key)) {
        throw usageError(
          `子命令 "${command}" 不支持参数 --${key}。可用参数：${[...allowed].map((k) => `--${k}`).join(' ')}`,
        );
      }
      if (BOOLEAN_FLAGS.has(key)) {
        if (eq !== -1) throw usageError(`--${key} 是布尔参数，不接受值。`);
        opts[key] = true;
        continue;
      }
      let value;
      if (eq !== -1) {
        value = token.slice(eq + 1);
      } else {
        value = argv[i + 1];
        if (value === undefined || value.startsWith('--')) {
          throw usageError(`--${key} 需要一个值。`);
        }
        i++;
      }
      opts[key] = value;
      continue;
    }
    positional.push(token);
  }
  return { opts, positional };
}

function requireOpt(opts, key) {
  const value = opts[key];
  if (value === undefined || value === '') throw usageError(`缺少必需参数 --${key}。`);
  return value;
}

function intOpt(opts, key, fallback) {
  if (opts[key] === undefined) return fallback;
  const n = Number(opts[key]);
  if (!Number.isFinite(n) || n < 0) throw usageError(`--${key} 需要非负数字，收到: ${opts[key]}`);
  return n;
}

function numOpt(opts, key, fallback) {
  if (opts[key] === undefined) return fallback;
  const n = Number(opts[key]);
  if (!Number.isFinite(n) || n < 0) throw usageError(`--${key} 需要非负数字，收到: ${opts[key]}`);
  return n;
}

function normalizeUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) throw usageError('--url 不能为空。');
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    if (/^(https?|file):/i.test(raw)) return raw;
    throw usageError(`只支持 http(s):// 或 file:// URL，收到: ${raw}`);
  }
  const abs = path.resolve(raw);
  if (!fs.existsSync(abs)) throw usageError(`URL 不是合法协议，且本地路径不存在: ${raw}`);
  return pathToFileURL(abs).href;
}

function parseViewport(text) {
  const m = String(text).trim().match(/^(\d+)x(\d+)$/i);
  if (!m) throw usageError(`视口格式应为 WxH，例如 1440x900，收到: ${text}`);
  const width = Number(m[1]);
  const height = Number(m[2]);
  if (width < 1 || height < 1) throw usageError(`视口尺寸必须为正数: ${text}`);
  return { width, height, label: `${width}x${height}` };
}

function parseViewports(text) {
  const list = String(text || '360x800,768x1024,1440x900')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const vp = parseViewport(item);
    if (seen.has(vp.label)) continue;
    seen.add(vp.label);
    out.push(vp);
  }
  if (!out.length) throw usageError('至少需要一个视口。');
  return out;
}

function parseTheme(text) {
  const theme = String(text || 'light').trim();
  if (theme !== 'light' && theme !== 'dark') throw usageError(`--theme 只支持 light / dark，收到: ${theme}`);
  return theme;
}

function parseThemes(text) {
  const list = String(text || 'light,dark')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const themes = [];
  for (const item of list) {
    const theme = parseTheme(item);
    if (!themes.includes(theme)) themes.push(theme);
  }
  if (!themes.length) throw usageError('至少需要一个主题。');
  return themes;
}

// ---------------------------------------------------------------------------
// Playwright 动态解析（不安装依赖）
// ---------------------------------------------------------------------------

function packageEntry(pkgDir) {
  const pkgJson = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgJson)) return null;
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
  } catch {
    return null;
  }
  const candidates = [];
  const exportRoot = pkg.exports && (pkg.exports['.'] ?? pkg.exports);
  if (exportRoot && typeof exportRoot === 'object') {
    for (const key of ['import', 'require', 'default']) {
      const target = exportRoot[key];
      if (typeof target === 'string') candidates.push(target);
    }
  }
  if (typeof pkg.exports === 'string') candidates.push(pkg.exports);
  if (pkg.main) candidates.push(pkg.main);
  candidates.push('index.mjs', 'index.js', 'lib/index.js');
  for (const rel of candidates) {
    const file = path.resolve(pkgDir, rel);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

function globalNpmRoot() {
  try {
    const bin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const out = execFileSync(bin, ['root', '-g'], { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] });
    const root = out.trim();
    return root && fs.existsSync(root) ? root : null;
  } catch {
    return null;
  }
}

function playwrightSearchPlan() {
  const plan = [];
  const envPath = process.env.FE_VERIFY_PLAYWRIGHT;
  if (envPath) plan.push({ label: `FE_VERIFY_PLAYWRIGHT=${envPath}`, target: path.resolve(envPath) });

  const requireFrom = (dir) => {
    try {
      return createRequire(path.join(dir, '__fv_resolve__.cjs')).resolve('playwright');
    } catch {
      return null;
    }
  };
  const cwdResolved = requireFrom(process.cwd());
  if (cwdResolved) plan.push({ label: `project resolution (${process.cwd()})`, target: cwdResolved });
  const scriptResolved = requireFrom(SCRIPT_DIR);
  if (scriptResolved && scriptResolved !== cwdResolved) {
    plan.push({ label: `script resolution (${SCRIPT_DIR})`, target: scriptResolved });
  }

  const dirs = [
    process.env.APPDATA ? path.join(process.env.APPDATA, 'npm', 'node_modules', 'playwright') : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'npm', 'node_modules', 'playwright') : null,
    path.join(os.homedir(), '.npm-global', 'lib', 'node_modules', 'playwright'),
    '/usr/local/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright',
    path.join(os.homedir(), '.local', 'share', 'pnpm', 'global', '5', 'node_modules', 'playwright'),
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'nodejs', 'node_modules', 'playwright') : null,
  ].filter(Boolean);

  const npmRoot = globalNpmRoot();
  if (npmRoot) dirs.push(path.join(npmRoot, 'playwright'));

  for (const dir of dirs) {
    plan.push({ label: dir, target: dir });
  }
  return plan;
}

async function importPlaywrightTarget(target) {
  let entry = target;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    entry = packageEntry(target);
    if (!entry) return { ok: false, error: '目录中找不到 package.json/index 入口' };
  }
  if (!entry || !fs.existsSync(entry)) return { ok: false, error: `入口不存在: ${entry || target}` };
  try {
    const mod = await import(pathToFileURL(entry).href);
    const api = mod && mod.chromium ? mod : mod && mod.default && mod.default.chromium ? mod.default : null;
    if (!api) return { ok: false, error: '模块没有导出 chromium/firefox/webkit' };
    return { ok: true, api, entry };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

const PLAYWRIGHT_INSTALL_HINT = `无法加载 Playwright（本脚本要求本机已安装，不联网安装依赖）。

请任选一种方式修复：
  1) 安装模块与浏览器：npm i -g playwright && npx playwright install chromium
  2) 指定模块位置：设置环境变量 FE_VERIFY_PLAYWRIGHT 指向 playwright 入口，
     例如 %APPDATA%\\npm\\node_modules\\playwright\\index.mjs 或该包目录。
  3) 如果你已有 Playwright 浏览器缓存但模块在别处，把模块目录加进上面的环境变量即可。

已尝试的解析位置会在下面列出。`;

async function loadPlaywright() {
  const attempts = [];
  for (const item of playwrightSearchPlan()) {
    const result = await importPlaywrightTarget(item.target);
    attempts.push({ source: item.label, target: item.target, ok: result.ok, error: result.error });
    if (result.ok) {
      info(`Playwright 已加载: ${result.entry}`);
      return { api: result.api, entry: result.entry, attempts };
    }
  }
  const detail = attempts
    .map((a, i) => `  ${i + 1}. ${a.source}${a.ok ? '' : `\n     失败: ${a.error}`}`)
    .join('\n');
  throw new CliError(`${PLAYWRIGHT_INSTALL_HINT}\n\n解析尝试：\n${detail}`, EXIT.TOOL);
}

// ---------------------------------------------------------------------------
// 浏览器启动（默认 chromium；失败时回退本机 Chrome 可执行文件 / channel）
// ---------------------------------------------------------------------------

const CHROME_EXECUTABLE_CANDIDATES = [
  process.env.FE_VERIFY_CHROMIUM,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const EDGE_EXECUTABLE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

function browserKind(value) {
  const v = String(value || '').trim();
  if (!v) return { kind: 'chromium' };
  const lower = v.toLowerCase();
  if (lower === 'chromium' || lower === 'chromium-headless-shell') return { kind: 'chromium' };
  if (lower === 'chrome') return { kind: 'chrome' };
  if (lower === 'msedge' || lower === 'edge') return { kind: 'msedge' };
  if (lower === 'firefox' || lower === 'webkit') return { kind: lower };
  if (fs.existsSync(v)) return { kind: 'executable', executablePath: path.resolve(v) };
  throw usageError(`--browser 不支持: ${v}（可选 chromium | chrome | msedge | firefox | webkit | 浏览器可执行文件路径）`);
}

function launchStrategies(spec) {
  if (spec.kind === 'executable') return [{ type: 'executable', executablePath: spec.executablePath }];
  if (spec.kind === 'firefox' || spec.kind === 'webkit') return [{ type: 'default' }];
  if (spec.kind === 'chrome') {
    return [
      { type: 'channel', channel: 'chrome' },
      ...CHROME_EXECUTABLE_CANDIDATES.filter((p) => fs.existsSync(p)).map((p) => ({ type: 'executable', executablePath: p })),
      { type: 'default' },
    ];
  }
  if (spec.kind === 'msedge') {
    return [
      { type: 'channel', channel: 'msedge' },
      ...EDGE_EXECUTABLE_CANDIDATES.filter((p) => fs.existsSync(p)).map((p) => ({ type: 'executable', executablePath: p })),
      { type: 'default' },
    ];
  }
  return [
    { type: 'default' },
    ...CHROME_EXECUTABLE_CANDIDATES.filter((p) => fs.existsSync(p)).map((p) => ({ type: 'executable', executablePath: p })),
    { type: 'channel', channel: 'chrome' },
    { type: 'channel', channel: 'msedge' },
  ];
}

async function launchBrowser(playwright, opts = {}) {
  const api = playwright && playwright.api ? playwright.api : playwright;
  const spec = browserKind(opts.browser);
  const headless = opts.headed || process.env.FE_VERIFY_HEADED ? false : true;
  const typeName = spec.kind === 'firefox' || spec.kind === 'webkit' ? spec.kind : 'chromium';
  const browserType = api[typeName];
  if (!browserType) throw new CliError(`当前 Playwright 版本没有 ${typeName} 浏览器类型。`, EXIT.TOOL);

  const attempts = [];
  for (const strategy of launchStrategies(spec)) {
    const options = { headless, timeout: 60000 };
    let label;
    if (strategy.type === 'default') {
      label = `playwright-bundled-${typeName}`;
    } else if (strategy.type === 'executable') {
      options.executablePath = strategy.executablePath;
      label = `executable:${strategy.executablePath}`;
    } else {
      options.channel = strategy.channel;
      label = `channel:${strategy.channel}`;
    }
    try {
      const browser = await browserType.launch(options);
      const meta = { name: typeName, version: browser.version(), launchStrategy: label, headless };
      if (strategy.executablePath) meta.executablePath = strategy.executablePath;
      info(`浏览器已启动: ${meta.name} ${meta.version}（${label}）`);
      return { browser, meta, attempts };
    } catch (err) {
      attempts.push({ strategy: label, error: truncate(err && err.message ? err.message : err, 400) });
      info(`启动失败（${label}）: ${truncate(err && err.message ? err.message : err, 200)}`);
    }
  }
  const detail = attempts.map((a, i) => `  ${i + 1}. ${a.strategy}\n     ${a.error}`).join('\n');
  throw new CliError(
    `浏览器启动失败。已尝试：\n${detail}\n\n` +
      '修复建议：\n' +
      '  - npx playwright install chromium（安装 Playwright 自带 Chromium）\n' +
      '  - 或 --browser "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"\n' +
      '  - 或 --browser chrome（使用已安装的 Chrome channel）\n' +
      '  - 或设置 FE_VERIFY_CHROMIUM 指向可用的 Chromium/Chrome 可执行文件',
    EXIT.TOOL,
  );
}

// ---------------------------------------------------------------------------
// 页面注入：性能观察器 + DOM 描述工具（供 walkFocus/describe 使用）
// 注意：该函数会被序列化进页面上下文，不能引用外部变量。
// ---------------------------------------------------------------------------

function installPageHooks() {
  try {
    const FV = { lcp: 0, lcpElement: null, cls: 0, longTasks: 0, installed: true };
    try {
      Object.defineProperty(window, '__FV', { value: FV, configurable: true });
    } catch {
      window.__FV = FV;
    }

    const cssEscape = (value) => {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
      return String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
    };

    const cssPath = (el) => {
      if (!el || el.nodeType !== 1) return '';
      const parts = [];
      let cur = el;
      let guard = 0;
      while (cur && cur.nodeType === 1 && guard++ < 6) {
        if (cur.id) {
          parts.unshift(`#${cssEscape(cur.id)}`);
          break;
        }
        let part = cur.tagName.toLowerCase();
        const parent = cur.parentElement;
        if (parent) {
          let index = 1;
          let sib = cur;
          while ((sib = sib.previousElementSibling)) {
            if (sib.tagName === cur.tagName) index++;
          }
          let total = 0;
          let scan = parent.firstElementChild;
          while (scan) {
            if (scan.tagName === cur.tagName) total++;
            scan = scan.nextElementSibling;
          }
          if (total > 1) part += `:nth-of-type(${index})`;
        }
        parts.unshift(part);
        cur = parent;
      }
      return parts.join(' > ');
    };

    const accName = (el) => {
      if (!el || el.nodeType !== 1) return '';
      const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
      const labelledby = el.getAttribute && el.getAttribute('aria-labelledby');
      if (labelledby) {
        const text = labelledby
          .split(/\s+/)
          .map((id) => {
            const ref = document.getElementById(id);
            return ref ? (ref.textContent || '').trim() : '';
          })
          .filter(Boolean)
          .join(' ');
        if (text) return text;
      }
      if (el.labels && el.labels.length) {
        const text = Array.from(el.labels)
          .map((label) => (label.textContent || '').trim())
          .filter(Boolean)
          .join(' ');
        if (text) return text;
      }
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') return (el.getAttribute('alt') || '').trim();
      if (tag === 'input') {
        const type = (el.getAttribute('type') || '').toLowerCase();
        if (type === 'submit' || type === 'button' || type === 'reset') return (el.value || type).trim();
        if (type === 'image') return (el.getAttribute('alt') || '').trim();
      }
      // 可访问名称“来自内容”只适用于有限角色；dialog/div 等容器的文本内容不算名称
      const role = (el.getAttribute('role') || '').toLowerCase();
      const contentTags = ['button', 'a', 'summary', 'option', 'td', 'th', 'caption', 'label', 'legend'];
      const contentRoles = [
        'button', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'tab', 'option',
        'checkbox', 'radio', 'switch', 'treeitem', 'gridcell', 'columnheader', 'rowheader', 'cell',
      ];
      if (contentTags.includes(tag) || contentRoles.includes(role)) {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) return text;
      }
      const title = el.getAttribute && el.getAttribute('title');
      if (title && title.trim()) return title.trim();
      const inputValue = tag === 'input' ? (el.value || '').trim() : '';
      return inputValue;
    };

    const isHidden = (el) => {
      if (!el || el.nodeType !== 1) return true;
      try {
        if (el.closest('[aria-hidden="true"]')) return true;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return true;
        if (el.hidden) return true;
      } catch {
        return false;
      }
      return false;
    };

    try {
      Object.defineProperty(window, '__fv', {
        value: { cssPath, cssEscape, accName, isHidden },
        configurable: true,
      });
    } catch {
      window.__fv = { cssPath, cssEscape, accName, isHidden };
    }

    if (window.PerformanceObserver) {
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) {
            FV.lcp = last.startTime;
            const el = last.element;
            FV.lcpElement = el && el.tagName ? el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') : null;
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        /* 浏览器不支持则留空 */
      }
      try {
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) FV.cls += entry.value;
          });
        }).observe({ type: 'layout-shift', buffered: true });
      } catch {
        /* 同上 */
      }
      try {
        new PerformanceObserver((list) => {
          FV.longTasks += list.getEntries().length;
        }).observe({ type: 'longtask', buffered: true });
      } catch {
        /* 同上 */
      }
    }
  } catch {
    /* 注入失败不阻断验证，但性能/描述字段会降级为空 */
  }
}

// ---------------------------------------------------------------------------
// 导航与等待
// ---------------------------------------------------------------------------

async function openPage({ browser, url, viewport, theme, timeout, waitFor, settleMs, beforeNavigate }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: theme,
    deviceScaleFactor: 1,
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  await page.addInitScript(installPageHooks);
  // 控制台/异常/请求失败监听必须在 goto 之前挂载，否则漏掉加载期间的报错
  if (typeof beforeNavigate === 'function') await beforeNavigate(page);

  const started = Date.now();
  let response;
  try {
    response = await page.goto(url, { waitUntil: 'load', timeout });
  } catch (err) {
    await context.close().catch(() => {});
    throw new CliError(
      `页面加载失败: ${url}\n原因: ${truncate(err && err.message ? err.message : err, 500)}\n` +
        '提示：确认 URL 可访问；file:// 页面请确认路径存在且已正确转义。',
      EXIT.TOOL,
    );
  }
  if (waitFor) {
    try {
      await page.waitForSelector(waitFor, { timeout });
    } catch {
      info(`警告：--wait-for 选择器在超时前未出现: ${waitFor}`);
    }
  }
  await page
    .evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true))
    .catch(() => {});
  if (settleMs > 0) await page.waitForTimeout(settleMs);
  return { context, page, response, loadMs: Date.now() - started };
}

// ---------------------------------------------------------------------------
// 采集器：可访问性 / 溢出 / 性能 / 焦点 / 对话框
// ---------------------------------------------------------------------------

function scanAccessibility() {
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  const violations = [];

  const cssEscape = (value) => {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
  };
  const cssPath = (el) => {
    if (!el || el.nodeType !== 1) return '';
    const parts = [];
    let cur = el;
    let guard = 0;
    while (cur && cur.nodeType === 1 && guard++ < 6) {
      if (cur.id) {
        parts.unshift(`#${cssEscape(cur.id)}`);
        break;
      }
      let part = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (parent) {
        let index = 1;
        let sib = cur;
        while ((sib = sib.previousElementSibling)) {
          if (sib.tagName === cur.tagName) index++;
        }
        let total = 0;
        let scan = parent.firstElementChild;
        while (scan) {
          if (scan.tagName === cur.tagName) total++;
          scan = scan.nextElementSibling;
        }
        if (total > 1) part += `:nth-of-type(${index})`;
      }
      parts.unshift(part);
      cur = parent;
    }
    return parts.join(' > ');
  };
  const accName = (el) => {
    if (!el || el.nodeType !== 1) return '';
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const text = labelledby
        .split(/\s+/)
        .map((id) => {
          const ref = document.getElementById(id);
          return ref ? (ref.textContent || '').trim() : '';
        })
        .filter(Boolean)
        .join(' ');
      if (text) return text;
    }
    if (el.labels && el.labels.length) {
      const text = Array.from(el.labels)
        .map((label) => (label.textContent || '').trim())
        .filter(Boolean)
        .join(' ');
      if (text) return text;
    }
    const tag = el.tagName.toLowerCase();
    if (tag === 'img') return (el.getAttribute('alt') || '').trim();
    if (tag === 'input') {
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'submit' || type === 'button' || type === 'reset') return (el.value || type).trim();
      if (type === 'image') return (el.getAttribute('alt') || '').trim();
    }
    // 可访问名称“来自内容”只适用于有限角色；dialog/div 等容器的文本内容不算名称
    const role = (el.getAttribute('role') || '').toLowerCase();
    const contentTags = ['button', 'a', 'summary', 'option', 'td', 'th', 'caption', 'label', 'legend'];
    const contentRoles = [
      'button', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'tab', 'option',
      'checkbox', 'radio', 'switch', 'treeitem', 'gridcell', 'columnheader', 'rowheader', 'cell',
    ];
    if (contentTags.includes(tag) || contentRoles.includes(role)) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) return text;
    }
    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();
    return tag === 'input' ? (el.value || '').trim() : '';
  };
  const isHidden = (el) => {
    if (!el || el.nodeType !== 1) return true;
    try {
      if (el.closest('[aria-hidden="true"]')) return true;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      if (el.hidden) return true;
    } catch {
      return false;
    }
    return false;
  };
  const add = (rule, severity, el, detail, evidence) => {
    violations.push({
      rule,
      severity,
      selector: cssPath(el),
      tag: el.tagName.toLowerCase(),
      detail,
      evidence: Object.assign(
        {
          html: (el.outerHTML || '').replace(/\s+/g, ' ').slice(0, 200),
          tag: el.tagName.toLowerCase(),
        },
        evidence || {},
      ),
    });
  };

  // 1. 图片 alt
  const images = Array.from(document.querySelectorAll('img'));
  images.forEach((img) => {
    const role = (img.getAttribute('role') || '').toLowerCase();
    if (role === 'presentation' || role === 'none') return;
    if (img.closest('[aria-hidden="true"]')) return;
    if (!img.hasAttribute('alt')) {
      add('img-missing-alt', 'serious', img, '<img> 缺少 alt 属性（装饰性图片也应显式写 alt=""）', {
        src: truncateSrc(img.getAttribute('src')),
      });
    }
  });

  // 2. 按钮 / 链接可访问名称
  const controls = Array.from(
    document.querySelectorAll('button, [role="button"], a[href], [role="link"], summary'),
  );
  controls.forEach((el) => {
    if (isHidden(el)) return;
    const name = accName(el);
    if (!name) {
      const kind = el.tagName === 'A' ? '链接' : '按钮';
      add('control-no-accessible-name', 'serious', el, `${kind}缺少可访问名称（文本/aria-label/aria-labelledby/title 均为空）`);
    }
  });

  // 3. 表单控件 label
  const formControls = Array.from(document.querySelectorAll('input, select, textarea'));
  formControls.forEach((el) => {
    if (isHidden(el)) return;
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (['hidden', 'submit', 'button', 'reset'].includes(type)) return;
    if (!accName(el)) {
      add(
        'form-control-no-label',
        'serious',
        el,
        '表单控件缺少关联 label / aria-label / aria-labelledby（placeholder 不能替代 label）',
      );
    }
  });

  // 4. 重复 id
  const idMap = new Map();
  document.querySelectorAll('[id]').forEach((el) => {
    if (!el.id) return;
    if (!idMap.has(el.id)) idMap.set(el.id, []);
    idMap.get(el.id).push(el);
  });
  idMap.forEach((els, id) => {
    if (els.length > 1) {
      add('duplicate-id', 'moderate', els[0], `id="${id}" 在文档中出现 ${els.length} 次`, {
        id,
        count: els.length,
        selectors: els.slice(0, 5).map((el) => cssPath(el)),
      });
    }
  });

  // 5. 标题层级跳级
  const headingEls = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
  const headingOutline = headingEls.map((h) => ({
    level: Number(h.tagName.slice(1)),
    selector: cssPath(h),
    text: (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
  }));
  for (let i = 1; i < headingOutline.length; i++) {
    if (headingOutline[i].level - headingOutline[i - 1].level > 1) {
      add(
        'heading-skip',
        'moderate',
        headingEls[i],
        `标题层级从 h${headingOutline[i - 1].level} 跳到 h${headingOutline[i].level}`,
        { previous: headingOutline[i - 1] },
      );
    }
  }

  // 6. aria-hidden 内含可聚焦元素
  document.querySelectorAll('[aria-hidden="true"]').forEach((container) => {
    Array.from(container.querySelectorAll(FOCUSABLE)).forEach((el) => {
      if (el.hasAttribute('disabled')) return;
      if (el.getAttribute('tabindex') === '-1') return;
      add(
        'aria-hidden-focusable',
        'serious',
        el,
        'aria-hidden="true" 容器内仍有可聚焦元素（键盘能进入，但辅助技术看不到）',
        { containerSelector: cssPath(container) },
      );
    });
  });

  // 7. dialog 语义与关闭方式
  const dialogs = [];
  document.querySelectorAll('dialog').forEach((dlg) => {
    const name = accName(dlg);
    let modal = false;
    try {
      modal = dlg.matches(':modal');
    } catch {
      modal = false;
    }
    const closeCandidates = Array.from(
      dlg.querySelectorAll('button, [role="button"], [data-close], [data-dismiss], a[href], input[type="button"], input[type="submit"]'),
    );
    let closeEl = null;
    for (const candidate of closeCandidates) {
      const candidateName = accName(candidate);
      if (/close|dismiss|关闭|取消|cancel|×|✕/i.test(candidateName)) {
        closeEl = candidate;
        break;
      }
    }
    if (!closeEl) {
      const dialogForm = dlg.querySelector('form[method="dialog"]');
      if (dialogForm) closeEl = dialogForm;
    }
    if (!name) {
      add('dialog-no-name', 'serious', dlg, '<dialog> 缺少可访问名称（aria-label 或 aria-labelledby）');
    }
    if (!closeEl) {
      add('dialog-no-close', 'serious', dlg, '<dialog> 内找不到具备可访问名称的关闭控件（按钮 / form method="dialog"）');
    }
    dialogs.push({
      selector: cssPath(dlg),
      open: !!dlg.open,
      modal,
      name,
      hasClose: !!closeEl,
      closeSelector: closeEl ? cssPath(closeEl) : null,
      closeName: closeEl ? accName(closeEl) : null,
    });
  });

  const stats = {
    images: images.length,
    controls: controls.length,
    formControls: formControls.length,
    headings: headingEls.length,
    dialogs: dialogs.length,
    ids: document.querySelectorAll('[id]').length,
    ariaHiddenContainers: document.querySelectorAll('[aria-hidden="true"]').length,
  };

  function truncateSrc(src) {
    if (!src) return '';
    return src.length > 120 ? `${src.slice(0, 117)}...` : src;
  }

  return { violations, stats, headingOutline, dialogs };
}

async function scanOverflow(page) {
  return page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const doc = document.documentElement;
    const scrollWidth = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
    const hasOverflow = scrollWidth > innerWidth + 1;
    const offenders = [];
    if (hasOverflow) {
      const fv = window.__fv || {};
      const elements = Array.from(document.querySelectorAll('body *'));
      for (const el of elements) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.right > innerWidth + 1 || rect.left < -1) {
          offenders.push({
            selector: fv.cssPath ? fv.cssPath(el) : el.tagName.toLowerCase(),
            tag: el.tagName.toLowerCase(),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
          });
        }
      }
    }
    return {
      viewportWidth: innerWidth,
      scrollWidth,
      hasOverflow,
      offenders: offenders.slice(0, 10),
      offenderCount: offenders.length,
    };
  });
}

async function collectPerf(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint') || [];
    const fcpEntry = paint.find((entry) => entry.name === 'first-contentful-paint') || null;
    const fv = window.__FV || {};
    const resources = performance.getEntriesByType('resource');
    return {
      ttfb: nav ? Math.round(nav.responseStart) : null,
      domInteractive: nav ? Math.round(nav.domInteractive) : null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
      fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null,
      lcp: fv.lcp ? Math.round(fv.lcp) : null,
      lcpElement: fv.lcpElement || null,
      cls: typeof fv.cls === 'number' ? Math.round(fv.cls * 10000) / 10000 : null,
      longTasks: typeof fv.longTasks === 'number' ? fv.longTasks : null,
      resourceCount: resources.length,
      transferSize: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      devicePixelRatio: window.devicePixelRatio,
    };
  });
}

async function walkFocus(page, { maxTabs = 40, settleMs = 80, label = '' } = {}) {
  await page.bringToFront().catch(() => {});
  await page
    .evaluate(() => {
      const active = document.activeElement;
      if (active && typeof active.blur === 'function') active.blur();
    })
    .catch(() => {});
  const tabStops = [];
  const seen = new Set();
  let cycle = false;
  let reachedBody = false;
  let bodyStreak = 0;
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    if (settleMs > 0) await page.waitForTimeout(settleMs);
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return { body: true };
      const fv = window.__fv || {};
      const cs = getComputedStyle(el);
      const outlineVisible = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const shadowVisible = !!cs.boxShadow && cs.boxShadow !== 'none';
      let focusVisible = false;
      try {
        focusVisible = el.matches(':focus-visible');
      } catch {
        focusVisible = false;
      }
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        selector: fv.cssPath ? fv.cssPath(el) : el.tagName.toLowerCase(),
        name: fv.accName ? (fv.accName(el) || '').slice(0, 80) : '',
        focusVisible,
        outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
        boxShadow: (cs.boxShadow || 'none').slice(0, 100),
        visibleRing: !!(outlineVisible || shadowVisible),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        },
      };
    });
    // 焦点落在 body 上通常意味着“本轮没有落到可聚焦元素”（modal 打开时会在 body 与唯一按钮之间跳动）
    if (stop.body) {
      bodyStreak++;
      reachedBody = true;
      if (bodyStreak >= 3) break;
      continue;
    }
    bodyStreak = 0;
    if (seen.has(stop.selector)) {
      cycle = true;
      break;
    }
    seen.add(stop.selector);
    tabStops.push(Object.assign({ index: tabStops.length }, stop));
  }
  const missingRings = tabStops
    .filter((stop) => stop.focusVisible && !stop.visibleRing)
    .map((stop) => ({ selector: stop.selector, name: stop.name, outline: stop.outline, boxShadow: stop.boxShadow }));
  return { label, tabStops, stopCount: tabStops.length, cycle, reachedBody, missingRings };
}

async function checkDialogBehavior(page, dialogs) {
  const result = {
    found: dialogs.length > 0,
    open: dialogs.some((d) => d.open),
    modal: dialogs.some((d) => d.modal),
    escapeCloses: null,
    closeButtonCloses: null,
    closeSelector: null,
  };
  if (!result.modal) return result;
  const closeSelector = (dialogs.find((d) => d.open && d.closeSelector) || {}).closeSelector || null;
  result.closeSelector = closeSelector;

  // 1) Escape 是否关闭（原生 modal dialog 应关闭）
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  result.escapeCloses = await page.evaluate(() => {
    try {
      return !document.querySelector('dialog:modal');
    } catch {
      return false;
    }
  });

  // 2) 关闭按钮是否真的能关闭：必要时重新 open 再点击
  if (closeSelector) {
    await page
      .evaluate(() => {
        const dlg = document.querySelector('dialog');
        if (!dlg) return false;
        if (!dlg.open) {
          try {
            dlg.showModal();
          } catch {
            dlg.setAttribute('open', '');
          }
        }
        return true;
      })
      .catch(() => {});
    await page.waitForTimeout(60);
    try {
      await page.click(closeSelector, { timeout: 4000 });
      await page.waitForTimeout(100);
      result.closeButtonCloses = await page.evaluate(() => {
        const dlg = document.querySelector('dialog');
        return !(dlg && dlg.open);
      });
    } catch (err) {
      result.closeButtonCloses = false;
      result.closeError = truncate(err && err.message ? err.message : err, 300);
    }
  }
  // 最终态：没有仍处于 open 的 dialog（关闭后被移除也算已关闭），才允许做“关闭后焦点走查”
  result.closed = await page
    .evaluate(() => Array.from(document.querySelectorAll('dialog')).every((dialog) => !dialog.open))
    .catch(() => false);
  return result;
}

// ---------------------------------------------------------------------------
// checks DSL
// ---------------------------------------------------------------------------

function loadChecks(file) {
  if (!fs.existsSync(file)) throw usageError(`--checks 文件不存在: ${file}`);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw usageError(`--checks 不是合法 JSON: ${file}\n${err.message}`);
  }
  const checks = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.checks) ? parsed.checks : null;
  if (!checks) throw usageError('--checks 文件必须是断言数组，或 { "checks": [...] }。');
  checks.forEach((check, index) => {
    if (!check || typeof check !== 'object' || Array.isArray(check)) {
      throw usageError(`checks[${index}] 不是对象。`);
    }
    const supported = ['selector', 'exists', 'count', 'computed', 'textContains', 'attribute', 'hidden', 'urlNotContains', 'label'];
    const keys = Object.keys(check).filter((key) => !supported.includes(key));
    if (keys.length) {
      info(`警告：checks[${index}] 含未知字段 ${keys.join(', ')}（会被忽略）`);
    }
    const hasAssertion = ['exists', 'count', 'computed', 'textContains', 'attribute', 'hidden', 'urlNotContains'].some(
      (key) => check[key] !== undefined,
    );
    if (!hasAssertion) throw usageError(`checks[${index}] 没有任何断言字段。`);
  });
  return { file, checks };
}

async function evaluateChecks(page, checks) {
  return page.evaluate((checkList) => {
    const results = [];
    const cssEscape = (value) => {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
      return String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
    };
    const cssPath = (el) => {
      if (!el || el.nodeType !== 1) return '';
      if (el.id) return `#${cssEscape(el.id)}`;
      const parts = [];
      let cur = el;
      let guard = 0;
      while (cur && cur.nodeType === 1 && guard++ < 6) {
        if (cur.id) {
          parts.unshift(`#${cssEscape(cur.id)}`);
          break;
        }
        let part = cur.tagName.toLowerCase();
        const parent = cur.parentElement;
        if (parent) {
          let index = 1;
          let sib = cur;
          while ((sib = sib.previousElementSibling)) {
            if (sib.tagName === cur.tagName) index++;
          }
          let total = 0;
          let scan = parent.firstElementChild;
          while (scan) {
            if (scan.tagName === cur.tagName) total++;
            scan = scan.nextElementSibling;
          }
          if (total > 1) part += `:nth-of-type(${index})`;
        }
        parts.unshift(part);
        cur = parent;
      }
      return parts.join(' > ');
    };
    const camelToKebab = (value) => String(value).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

    for (let i = 0; i < checkList.length; i++) {
      const check = checkList[i] || {};
      const base = { index: i, label: check.label || null, selector: check.selector || null };
      if (check.urlNotContains !== undefined) {
        const actual = location.href;
        const ok = !actual.includes(String(check.urlNotContains));
        results.push(
          Object.assign(base, {
            assertion: 'urlNotContains',
            expected: `URL 不包含 "${check.urlNotContains}"`,
            actual,
            ok,
            evidence: { url: actual },
          }),
        );
        continue;
      }
      if (!check.selector) {
        results.push(
          Object.assign(base, {
            assertion: 'selector',
            expected: '存在 selector 字段',
            actual: '缺失',
            ok: false,
            evidence: {},
          }),
        );
        continue;
      }
      let elements;
      try {
        elements = Array.from(document.querySelectorAll(check.selector));
      } catch (err) {
        results.push(
          Object.assign(base, {
            assertion: 'selector',
            expected: '合法 CSS 选择器',
            actual: `选择器语法错误: ${err.message}`,
            ok: false,
            evidence: {},
          }),
        );
        continue;
      }
      const first = elements[0] || null;

      if (check.exists !== undefined) {
        const expectedExists = !!check.exists;
        const actualExists = elements.length > 0;
        results.push(
          Object.assign(base, {
            assertion: 'exists',
            expected: `元素${expectedExists ? '存在' : '不存在'}`,
            actual: `匹配 ${elements.length} 个元素`,
            ok: expectedExists === actualExists,
            evidence: {
              matchedCount: elements.length,
              firstSelector: first ? cssPath(first) : null,
              html: first ? (first.outerHTML || '').replace(/\s+/g, ' ').slice(0, 200) : null,
            },
          }),
        );
      }

      if (check.count !== undefined) {
        const expectedCount = Number(check.count);
        results.push(
          Object.assign(base, {
            assertion: 'count',
            expected: `count = ${expectedCount}`,
            actual: `匹配 ${elements.length} 个元素`,
            ok: elements.length === expectedCount,
            evidence: { matchedCount: elements.length, selectors: elements.slice(0, 5).map((el) => cssPath(el)) },
          }),
        );
      }

      if (check.computed !== undefined) {
        const props = Object.keys(check.computed);
        const actual = {};
        for (const prop of props) {
          let value = null;
          if (first) {
            const cs = getComputedStyle(first);
            value = cs[prop] !== undefined ? cs[prop] : cs.getPropertyValue(camelToKebab(prop));
          }
          actual[prop] = value === null || value === undefined ? null : String(value).trim();
        }
        const mismatches = props.filter((prop) => actual[prop] !== String(check.computed[prop]).trim());
        results.push(
          Object.assign(base, {
            assertion: 'computed',
            expected: JSON.stringify(check.computed),
            actual: first ? JSON.stringify(actual) : '选择器未匹配到元素，无法读取计算样式',
            ok: !!first && mismatches.length === 0,
            evidence: {
              matchedCount: elements.length,
              firstSelector: first ? cssPath(first) : null,
              computed: actual,
            },
          }),
        );
      }

      if (check.textContains !== undefined) {
        const text = first ? (first.textContent || '').replace(/\s+/g, ' ').trim() : null;
        results.push(
          Object.assign(base, {
            assertion: 'textContains',
            expected: `文本包含 "${check.textContains}"`,
            actual: first ? `"${text.slice(0, 200)}"` : '选择器未匹配到元素',
            ok: !!first && text.includes(String(check.textContains)),
            evidence: {
              matchedCount: elements.length,
              firstSelector: first ? cssPath(first) : null,
              text: text ? text.slice(0, 300) : null,
            },
          }),
        );
      }

      if (check.attribute !== undefined) {
        const attrs = check.attribute;
        const actual = {};
        for (const name of Object.keys(attrs)) {
          actual[name] = first ? first.getAttribute(name) : null;
        }
        const mismatches = Object.keys(attrs).filter((name) => actual[name] !== String(attrs[name]));
        results.push(
          Object.assign(base, {
            assertion: 'attribute',
            expected: JSON.stringify(attrs),
            actual: first ? JSON.stringify(actual) : '选择器未匹配到元素',
            ok: !!first && mismatches.length === 0,
            evidence: {
              matchedCount: elements.length,
              firstSelector: first ? cssPath(first) : null,
              attributes: actual,
            },
          }),
        );
      }

      if (check.hidden !== undefined) {
        const expectedHidden = !!check.hidden;
        let actualHidden = null;
        if (first) {
          try {
            if (typeof first.checkVisibility === 'function') {
              actualHidden = !first.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
            } else {
              const cs = getComputedStyle(first);
              actualHidden =
                cs.display === 'none' ||
                cs.visibility === 'hidden' ||
                first.hidden ||
                first.getClientRects().length === 0;
            }
          } catch {
            actualHidden = null;
          }
        }
        results.push(
          Object.assign(base, {
            assertion: 'hidden',
            expected: `元素${expectedHidden ? '隐藏' : '可见'}`,
            actual: first ? `hidden = ${actualHidden}` : '选择器未匹配到元素',
            ok: !!first && actualHidden === expectedHidden,
            evidence: {
              matchedCount: elements.length,
              firstSelector: first ? cssPath(first) : null,
              hidden: actualHidden,
            },
          }),
        );
      }
    }
    return results;
  }, checks);
}

// ---------------------------------------------------------------------------
// 图像像素差异（在浏览器 canvas 内完成）
// ---------------------------------------------------------------------------

async function compareImages(page, bufferA, bufferB, { channelThreshold = 32 } = {}) {
  if (bufferA.equals(bufferB)) {
    return {
      identical: true,
      sizeMismatch: false,
      widthA: null,
      heightA: null,
      widthB: null,
      heightB: null,
      width: null,
      height: null,
      diffPixels: 0,
      totalPixels: 0,
      diffPercent: 0,
      dataUrl: null,
    };
  }
  const a = bufferA.toString('base64');
  const b = bufferB.toString('base64');
  const result = await page.evaluate(
    async ({ aB64, bB64, threshold }) => {
      const decode = (b64) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('图像解码失败（不是有效的 PNG/JPEG？）'));
          img.src = `data:image/png;base64,${b64}`;
        });
      const [imgA, imgB] = await Promise.all([decode(aB64), decode(bB64)]);
      const width = Math.max(imgA.naturalWidth, imgB.naturalWidth);
      const height = Math.max(imgA.naturalHeight, imgB.naturalHeight);
      const makeCanvas = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        return { canvas, ctx };
      };
      const canvasA = makeCanvas();
      const canvasB = makeCanvas();
      canvasA.ctx.drawImage(imgA, 0, 0);
      canvasB.ctx.drawImage(imgB, 0, 0);
      const dataA = canvasA.ctx.getImageData(0, 0, width, height).data;
      const dataB = canvasB.ctx.getImageData(0, 0, width, height).data;
      const diff = canvasA.ctx.createImageData(width, height);
      const out = diff.data;
      let diffPixels = 0;
      for (let i = 0; i < dataA.length; i += 4) {
        const changed =
          Math.abs(dataA[i] - dataB[i]) > threshold ||
          Math.abs(dataA[i + 1] - dataB[i + 1]) > threshold ||
          Math.abs(dataA[i + 2] - dataB[i + 2]) > threshold ||
          Math.abs(dataA[i + 3] - dataB[i + 3]) > threshold;
        if (changed) {
          diffPixels++;
          out[i] = 255;
          out[i + 1] = 0;
          out[i + 2] = 255;
          out[i + 3] = 255;
        } else {
          const gray = Math.round(0.299 * dataA[i] + 0.587 * dataA[i + 1] + 0.114 * dataA[i + 2]);
          out[i] = 235;
          out[i + 1] = 235;
          out[i + 2] = 235;
          out[i + 3] = 255;
          const lighten = 0.25;
          out[i] = Math.round(gray * lighten + 235 * (1 - lighten));
          out[i + 1] = Math.round(gray * lighten + 235 * (1 - lighten));
          out[i + 2] = Math.round(gray * lighten + 235 * (1 - lighten));
        }
      }
      canvasA.ctx.putImageData(diff, 0, 0);
      return {
        widthA: imgA.naturalWidth,
        heightA: imgA.naturalHeight,
        widthB: imgB.naturalWidth,
        heightB: imgB.naturalHeight,
        width,
        height,
        diffPixels,
        totalPixels: width * height,
        dataUrl: canvasA.canvas.toDataURL('image/png'),
      };
    },
    { aB64: a, bB64: b, threshold: channelThreshold },
  );
  const diffPercent = result.totalPixels ? (result.diffPixels / result.totalPixels) * 100 : 0;
  return {
    identical: result.diffPixels === 0,
    sizeMismatch: result.widthA !== result.widthB || result.heightA !== result.heightB,
    widthA: result.widthA,
    heightA: result.heightA,
    widthB: result.widthB,
    heightB: result.heightB,
    width: result.width,
    height: result.height,
    diffPixels: result.diffPixels,
    totalPixels: result.totalPixels,
    diffPercent: round(diffPercent, 4),
    dataUrl: result.dataUrl,
  };
}

function writeDiffImage(diffPath, dataUrl) {
  if (!dataUrl) return null;
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  ensureDir(path.dirname(diffPath));
  fs.writeFileSync(diffPath, Buffer.from(base64, 'base64'));
  return diffPath;
}

// ---------------------------------------------------------------------------
// run：一次完整验证
// ---------------------------------------------------------------------------

const QUICK_VIEWPORT = { width: 360, height: 800, label: '360x800' };

/** 有界并发：最多 limit 个任务同时执行，结果按输入顺序返回。 */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runnerCount = Math.max(1, Math.min(limit, items.length));
  const runners = Array.from({ length: runnerCount }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function cmdRun(opts) {
  const quick = opts.quick === true;
  if (quick) {
    if (opts.viewports) throw usageError('--quick 固定使用 360x800 单视口，不能与 --viewports 同用。');
    if (opts.theme) throw usageError('--quick 固定使用 light 主题，不能与 --theme 同用。');
    if (opts.baseline) throw usageError('--quick 不做基线截图矩阵；需要基线对比请使用完整模式。');
  }
  const url = normalizeUrl(requireOpt(opts, 'url'));
  const viewports = quick ? [QUICK_VIEWPORT] : parseViewports(opts.viewports);
  const themes = quick ? ['light'] : parseThemes(opts.theme);
  const totalPasses = viewports.length * themes.length;
  // 并发上限 8，避免一次拉起过多渲染进程；默认按采集数量取 4（快速模式单次采集）。
  const concurrency = Math.max(1, Math.min(8, intOpt(opts, 'concurrency', quick ? 1 : Math.min(4, totalPasses))));
  const settleMs = intOpt(opts, 'wait', 400);
  const timeout = intOpt(opts, 'timeout', 30000);
  const pixelThreshold = numOpt(opts, 'pixel-threshold', 0.1);
  const channelThreshold = intOpt(opts, 'channel-threshold', 32);
  const checksFile = opts.checks ? path.resolve(opts.checks) : null;
  const checks = checksFile ? loadChecks(checksFile) : null;
  const baselineDir = opts.baseline ? path.resolve(opts.baseline) : null;
  if (baselineDir && !fs.existsSync(baselineDir)) {
    throw usageError(`--baseline 目录不存在: ${baselineDir}`);
  }
  const outDir = path.resolve(opts.out || defaultOutDir('run'));
  ensureDir(outDir);
  const screenshotDir = ensureDir(path.join(outDir, 'screenshots'));
  const diffDir = ensureDir(path.join(outDir, 'diffs'));
  const startedAt = new Date();
  const startedMs = Date.now();
  const primaryLabel = `${viewports[0].label} / ${themes[0]}`;

  if (checksFile) writeTextFile(path.join(outDir, 'inputs', 'checks.json'), `${JSON.stringify(checks.checks, null, 2)}\n`);
  if (quick) info('快速模式（quick）：仅 360x800 / light，跳过性能、键盘焦点、对话框行为与基线矩阵；PASS 不等于完整验收。');

  const launchStarted = Date.now();
  const playwright = await loadPlaywright();
  const launched = await launchBrowser(playwright, opts);
  const browser = launched.browser;
  const launchMs = Date.now() - launchStarted;

  const targets = [];
  for (const viewport of viewports) {
    for (const theme of themes) targets.push({ viewport, theme, label: `${viewport.label} / ${theme}` });
  }
  if (totalPasses > 1) info(`有界并发采集 ${totalPasses} 个视口×主题（并发 ${concurrency}）`);

  let passes = [];
  let baseline = null;
  let baselineMs = 0;
  const passesStarted = Date.now();
  try {
    passes = await mapWithConcurrency(targets, concurrency, async (target) => {
      const isPrimary = target.label === primaryLabel;
      const primaryScope = quick ? '主采集：checks（quick 跳过 perf/focus/dialog）' : '主采集：checks/perf/focus/dialog';
      info(`采集 ${target.label}${isPrimary ? `（${primaryScope}）` : ''}`);
      return collectPass({
        browser,
        url,
        viewport: target.viewport,
        theme: target.theme,
        label: target.label,
        isPrimary,
        quick,
        checks,
        screenshotDir,
        timeout,
        settleMs,
        waitFor: opts['wait-for'],
      });
    });

    if (baselineDir) {
      const baselineStarted = Date.now();
      info(`像素基线对比: ${baselineDir}`);
      const comparePage = await browser.newPage();
      baseline = { dir: baselineDir, comparisons: [], failures: 0, warnings: [] };
      const actualFiles = fs
        .readdirSync(screenshotDir)
        .filter((name) => name.endsWith('.png'))
        .sort();
      for (const fileName of actualFiles) {
        const actualFile = path.join(screenshotDir, fileName);
        const baselineFile = path.join(baselineDir, fileName);
        if (!fs.existsSync(baselineFile)) {
          baseline.comparisons.push({
            name: fileName,
            ok: true,
            skipped: true,
            note: '基线缺少同名截图（跳过，不计失败）',
            baselineFile,
            actualFile,
          });
          baseline.warnings.push(`基线缺少 ${fileName}`);
          continue;
        }
        const actualBuffer = fs.readFileSync(actualFile);
        const baselineBuffer = fs.readFileSync(baselineFile);
        const comparison = await compareImages(comparePage, actualBuffer, baselineBuffer, { channelThreshold });
        const diffPath = writeDiffImage(path.join(diffDir, fileName), comparison.dataUrl);
        const ok = !comparison.sizeMismatch && comparison.diffPercent <= pixelThreshold;
        if (!ok) baseline.failures++;
        baseline.comparisons.push({
          name: fileName,
          ok,
          baselineFile,
          actualFile,
          diffPath,
          sizeMismatch: comparison.sizeMismatch,
          widthA: comparison.widthA,
          heightA: comparison.heightA,
          widthB: comparison.widthB,
          heightB: comparison.heightB,
          diffPixels: comparison.diffPixels,
          totalPixels: comparison.totalPixels,
          diffPercent: comparison.diffPercent,
          note: comparison.sizeMismatch
            ? '截图尺寸不一致'
            : comparison.diffPercent > pixelThreshold
              ? `像素差异超过阈值 ${pixelThreshold}%`
              : '在阈值内',
        });
      }
      await comparePage.close().catch(() => {});
      baselineMs = Date.now() - baselineStarted;
    }
  } finally {
    await browser.close().catch(() => {});
  }
  const passesMs = Date.now() - passesStarted;

  const report = buildRunReport({
    url,
    outDir,
    mode: quick ? 'quick' : 'full',
    startedAt,
    durationMs: Date.now() - startedMs,
    timings: { launchMs, passesMs, baselineMs, totalMs: Date.now() - startedMs },
    browserMeta: launched.meta,
    viewports,
    themes,
    primaryLabel,
    passes,
    checksMeta: checks ? { file: checksFile, count: checks.checks.length } : null,
    baseline,
    config: {
      settleMs,
      timeout,
      pixelThresholdPercent: pixelThreshold,
      channelThreshold,
      checksFile,
      baselineDir,
      fullPage: true,
      quick,
      concurrency,
    },
  });

  const reportJsonPath = path.join(outDir, 'report.json');
  const reportMdPath = path.join(outDir, 'report.md');
  writeJsonFile(reportJsonPath, report);
  writeTextFile(reportMdPath, buildRunMarkdown(report));

  printRunSummary(report, { reportJsonPath, reportMdPath });
  return report.verdict === 'PASS' ? EXIT.PASS : opts['no-fail'] ? EXIT.PASS : EXIT.FAIL;
}

async function collectPass({
  browser,
  url,
  viewport,
  theme,
  label,
  isPrimary,
  quick = false,
  checks,
  screenshotDir,
  timeout,
  settleMs,
  waitFor,
}) {
  const passStarted = Date.now();

  const events = { console: [], consoleWarnings: [], pageErrors: [], requestFailures: [] };
  const attachListeners = (page) => {
    page.on('console', (msg) => {
      const type = msg.type();
      if (type !== 'error' && type !== 'warning') return;
      const entry = {
        type,
        text: msg.text(),
        pass: label,
        location: msg.location(),
        raw: msg.text(),
      };
      if (type === 'error') events.console.push(entry);
      else events.consoleWarnings.push(entry);
    });
    page.on('pageerror', (err) => {
      events.pageErrors.push({
        pass: label,
        name: err && err.name,
        message: err && err.message ? err.message : String(err),
        stack: err && err.stack ? String(err.stack).split('\n').slice(0, 6).join('\n') : null,
      });
    });
    page.on('requestfailed', (request) => {
      const requestUrl = request.url();
      if (requestUrl.startsWith('data:')) return;
      const failure = request.failure();
      events.requestFailures.push({
        pass: label,
        url: requestUrl,
        method: request.method(),
        resourceType: request.resourceType(),
        failure: failure ? failure.errorText : 'unknown',
      });
    });
  };
  const { context, page, loadMs } = await openPage({
    browser,
    url,
    viewport,
    theme,
    timeout,
    waitFor,
    settleMs,
    beforeNavigate: attachListeners,
  });

  // 加载完成后再补一次等待，确保控制台错误/请求失败已经落到事件队列
  await page.waitForTimeout(50);

  const screenshotFile = path.join(screenshotDir, `${viewport.label}_${theme}.png`);
  await page.screenshot({ path: screenshotFile, fullPage: true, animations: 'disabled', caret: 'hide' });

  const pass = {
    label,
    viewport: viewport.label,
    theme,
    screenshot: screenshotFile,
    loadMs,
    console: events.console,
    consoleWarnings: events.consoleWarnings,
    pageErrors: events.pageErrors,
    requestFailures: events.requestFailures,
    a11y: null,
    overflow: null,
    perf: null,
    focus: null,
    focusAfterDialog: null,
    dialog: null,
    checks: null,
    collectMs: null,
    skipped: quick ? ['perf', 'focus', 'focusAfterDialog', 'dialog'] : [],
  };

  try {
    pass.overflow = await scanOverflow(page);
    pass.a11y = await page.evaluate(scanAccessibility);

    if (isPrimary) {
      if (checks) {
        const results = await evaluateChecks(page, checks.checks);
        pass.checks = {
          file: checks.file,
          total: results.length,
          passed: results.filter((r) => r.ok).length,
          failed: results.filter((r) => !r.ok).length,
          results,
        };
      }
      if (!quick) {
        pass.perf = await collectPerf(page);
        // 焦点环在 keypress 后同步生效；40ms（约 2-3 帧）足以让 :focus-visible 与样式稳定，
        // 相比每步 80ms 可把 40 步走查的固定等待减半，且不影响 activeElement/计算样式证据。
        pass.focus = await walkFocus(page, { label: `${label}（dialog 打开时）`, maxTabs: 40, settleMs: 40 });
        pass.dialog = await checkDialogBehavior(page, pass.a11y.dialogs);
        // 只有存在、且确实被关闭的模态 dialog 时，“关闭后焦点走查”才有独立证据；
        // 否则（无 dialog / Escape 与关闭按钮都失败、dialog 仍开着）跳过这次额外的 Tab 走查。
        if (pass.dialog && pass.dialog.modal && pass.dialog.closed === true) {
          pass.focusAfterDialog = await walkFocus(page, {
            label: `${label}（dialog 关闭后）`,
            maxTabs: 40,
            settleMs: 40,
          });
        } else {
          pass.focusAfterDialogSkipped = pass.dialog && pass.dialog.modal
            ? 'dialog 未能关闭，关闭后的焦点走查无独立证据'
            : '页面没有打开的模态 dialog';
        }
      }
    }
  } finally {
    // 截图后再关闭上下文，避免页面被销毁导致证据缺失
    await context.close().catch(() => {});
  }

  pass.collectMs = Date.now() - passStarted;
  return pass;
}

const A11Y_RULE_LABELS = {
  'img-missing-alt': '图片缺少 alt',
  'control-no-accessible-name': '按钮/链接缺少可访问名称',
  'form-control-no-label': '表单控件缺少标签',
  'duplicate-id': '重复 id',
  'heading-skip': '标题层级跳级',
  'aria-hidden-focusable': 'aria-hidden 容器内含可聚焦元素',
  'dialog-no-name': '对话框缺少可访问名称',
  'dialog-no-close': '对话框缺少关闭方式',
  'focus-ring-missing': '键盘焦点不可见',
  'dialog-escape-fails': '对话框按 Escape 无法关闭',
  'dialog-close-fails': '对话框关闭按钮无效',
};

function buildRunReport({
  url,
  outDir,
  mode,
  startedAt,
  durationMs,
  timings,
  browserMeta,
  viewports,
  themes,
  primaryLabel,
  passes,
  checksMeta,
  baseline,
  config,
}) {
  const failures = [];
  const warnings = [];
  const screenshotList = passes.map((pass) => pass.screenshot);

  for (const pass of passes) {
    for (const consoleError of pass.console) {
      failures.push({
        code: 'console-error',
        category: 'console',
        severity: 'serious',
        pass: pass.label,
        title: `控制台错误: ${truncate(consoleError.text, 140)}`,
        detail: consoleError.text,
        evidence: {
          raw: consoleError.text,
          location: consoleError.location,
          pass: pass.label,
          screenshot: pass.screenshot,
        },
      });
    }
    for (const pageError of pass.pageErrors) {
      failures.push({
        code: 'page-error',
        category: 'runtime',
        severity: 'critical',
        pass: pass.label,
        title: `未捕获异常: ${truncate(pageError.message, 140)}`,
        detail: pageError.message,
        evidence: {
          raw: pageError.message,
          stack: pageError.stack,
          pass: pass.label,
          screenshot: pass.screenshot,
        },
      });
    }
    for (const requestFailure of pass.requestFailures) {
      failures.push({
        code: 'request-failure',
        category: 'network',
        severity: 'serious',
        pass: pass.label,
        title: `请求失败: ${truncate(requestFailure.url, 120)}（${requestFailure.failure}）`,
        detail: `${requestFailure.method} ${requestFailure.url} → ${requestFailure.failure}`,
        evidence: { request: requestFailure, pass: pass.label, screenshot: pass.screenshot },
      });
    }
    for (const violation of pass.a11y ? pass.a11y.violations : []) {
      failures.push({
        code: `a11y:${violation.rule}`,
        category: 'a11y',
        severity: violation.severity || 'serious',
        pass: pass.label,
        title: `[${A11Y_RULE_LABELS[violation.rule] || violation.rule}] ${truncate(violation.detail, 120)}`,
        detail: `${violation.detail} | selector: ${violation.selector}`,
        selector: violation.selector,
        evidence: Object.assign({}, violation.evidence, { pass: pass.label, screenshot: pass.screenshot }),
      });
    }
    if (pass.overflow && pass.overflow.hasOverflow) {
      failures.push({
        code: 'horizontal-overflow',
        category: 'layout',
        severity: 'serious',
        pass: pass.label,
        title: `横向溢出: 文档宽 ${pass.overflow.scrollWidth}px > 视口 ${pass.overflow.viewportWidth}px`,
        detail: `溢出元素: ${pass.overflow.offenders.map((o) => `${o.selector}(右边缘 ${o.right}px)`).join(', ') || '未定位到具体元素'}`,
        evidence: {
          pass: pass.label,
          viewportWidth: pass.overflow.viewportWidth,
          scrollWidth: pass.overflow.scrollWidth,
          offenders: pass.overflow.offenders,
          screenshot: pass.screenshot,
        },
      });
    }
    if (pass.checks) {
      for (const result of pass.checks.results.filter((item) => !item.ok)) {
        failures.push({
          code: 'check-failed',
          category: 'checks',
          severity: 'serious',
          pass: pass.label,
          title: `断言失败: ${result.selector || result.assertion} — ${truncate(result.expected, 100)}`,
          detail: `期望 ${result.expected}，实际 ${result.actual}`,
          selector: result.selector,
          evidence: Object.assign({}, result.evidence, { assertion: result.assertion, expected: result.expected, actual: result.actual }),
        });
      }
    }
    const walkthroughs = [
      { key: 'focus', data: pass.focus },
      { key: 'focusAfterDialog', data: pass.focusAfterDialog },
    ];
    for (const walk of walkthroughs) {
      if (!walk.data) continue;
      for (const missing of walk.data.missingRings) {
        failures.push({
          code: 'focus-ring-missing',
          category: 'a11y',
          severity: 'serious',
          pass: pass.label,
          title: `键盘焦点不可见: ${missing.selector}`,
          detail: `元素获得焦点但没有 outline 或 box-shadow 焦点环（outline: ${missing.outline}, boxShadow: ${missing.boxShadow}）`,
          selector: missing.selector,
          evidence: { element: missing, walkthrough: walk.data.label, pass: pass.label, screenshot: pass.screenshot },
        });
      }
    }
    if (pass.dialog && pass.dialog.modal) {
      if (pass.dialog.escapeCloses === false) {
        failures.push({
          code: 'dialog-escape-fails',
          category: 'a11y',
          severity: 'serious',
          pass: pass.label,
          title: '对话框按 Escape 无法关闭',
          detail: 'showModal() 打开的 dialog 应按 Escape 关闭（cancel 事件），实测未关闭。',
          evidence: { dialog: pass.dialog, pass: pass.label, screenshot: pass.screenshot },
        });
      }
      if (pass.dialog.closeSelector && pass.dialog.closeButtonCloses === false) {
        failures.push({
          code: 'dialog-close-fails',
          category: 'a11y',
          severity: 'serious',
          pass: pass.label,
          title: '对话框关闭按钮无效',
          detail: `点击关闭控件 ${pass.dialog.closeSelector} 后 dialog 仍处于打开状态。`,
          evidence: { dialog: pass.dialog, pass: pass.label, screenshot: pass.screenshot },
        });
      }
    }
  }

  if (baseline) {
    for (const comparison of baseline.comparisons) {
      if (comparison.skipped) {
        continue;
      }
      if (!comparison.ok) {
        failures.push({
          code: comparison.sizeMismatch ? 'baseline-size-mismatch' : 'baseline-diff',
          category: 'baseline',
          severity: 'serious',
          pass: comparison.name,
          title: comparison.sizeMismatch
            ? `基线尺寸不一致: ${comparison.name}`
            : `基线像素差异 ${comparison.diffPercent}% > 阈值: ${comparison.name}`,
          detail: `基线 ${comparison.baselineFile}，实际 ${comparison.actualFile}`,
          evidence: {
            diffPercent: comparison.diffPercent,
            diffPixels: comparison.diffPixels,
            totalPixels: comparison.totalPixels,
            diffPath: comparison.diffPath,
            baselineFile: comparison.baselineFile,
            actualFile: comparison.actualFile,
            sizeMismatch: comparison.sizeMismatch,
          },
        });
      }
    }
    for (const warning of baseline.warnings) warnings.push({ code: 'baseline-warning', detail: warning });
  }

  if (!checksMeta) warnings.push({ code: 'no-checks', detail: '未提供 --checks，仅做自动检查（可加断言提高覆盖）' });
  if (mode === 'quick') {
    warnings.push({
      code: 'quick-mode',
      detail: '快速模式：仅 360x800 / light，未执行性能、键盘焦点、对话框行为与基线矩阵；quick PASS ≠ 完整验收，发布前必须跑完整模式。',
    });
  }
  const primary = passes.find((pass) => pass.label === primaryLabel);
  if (primary && primary.perf && primary.perf.lcp === null) {
    warnings.push({
      code: 'lcp-unavailable',
      detail: '未采集到 LCP（可能页面无内容或浏览器未报告），其余指标仍可用。',
    });
  }
  if (primary && primary.focus && primary.focus.stopCount === 0) {
    warnings.push({ code: 'no-tab-stops', detail: '主采集未走查到任何键盘焦点元素。' });
  }

  const a11yViolations = [];
  for (const pass of passes) {
    if (!pass.a11y) continue;
    for (const violation of pass.a11y.violations) {
      a11yViolations.push(Object.assign({ pass: pass.label }, violation));
    }
  }

  // 同一问题会在多个视口/主题重复出现：阻断项按“问题”去重，出现过的阶段记录在 passes[]
  const uniqueFailures = dedupeFailures(failures);
  const uniqueA11y = dedupeA11yViolations(a11yViolations);
  const countByCategory = (category) => uniqueFailures.filter((failure) => failure.category === category).length;
  const overflowViewports = new Set(
    passes.filter((pass) => pass.overflow && pass.overflow.hasOverflow).map((pass) => pass.viewport),
  ).size;

  const summary = {
    blocking: uniqueFailures.length,
    consoleErrors: countByCategory('console'),
    consoleWarnings: passes.reduce((sum, pass) => sum + pass.consoleWarnings.length, 0),
    pageErrors: countByCategory('runtime'),
    requestFailures: countByCategory('network'),
    a11yViolations: countByCategory('a11y'),
    overflowViewports,
    checkFailures: countByCategory('checks'),
    baselineFailures: countByCategory('baseline'),
    passes: passes.length,
    rawConsoleErrorEvents: passes.reduce((sum, pass) => sum + pass.console.length, 0),
    rawA11yViolationEvents: a11yViolations.length,
  };

  return {
    tool: { name: TOOL_NAME, version: TOOL_VERSION, script: SCRIPT_PATH },
    url,
    mode,
    verdict: uniqueFailures.length === 0 ? 'PASS' : 'FAIL',
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs,
    timings,
    browser: browserMeta,
    config,
    primaryPass: primaryLabel,
    summary,
    failures: uniqueFailures,
    failureEvents: failures.length,
    warnings,
    passes: passes.map((pass) => ({
      label: pass.label,
      viewport: pass.viewport,
      theme: pass.theme,
      screenshot: pass.screenshot,
      loadMs: pass.loadMs,
      collectMs: pass.collectMs,
      skipped: pass.skipped,
      consoleErrors: pass.console.length,
      consoleWarnings: pass.consoleWarnings.length,
      pageErrors: pass.pageErrors.length,
      requestFailures: pass.requestFailures.length,
      a11yViolations: pass.a11y ? pass.a11y.violations.length : 0,
      overflow: pass.overflow,
      perf: pass.perf,
      focus: pass.focus,
      focusAfterDialog: pass.focusAfterDialog,
      focusAfterDialogSkipped: pass.focusAfterDialogSkipped || null,
      dialog: pass.dialog,
      checks: pass.checks,
    })),
    console: passes.flatMap((pass) => pass.console),
    consoleWarnings: passes.flatMap((pass) => pass.consoleWarnings),
    pageErrors: passes.flatMap((pass) => pass.pageErrors),
    requestFailures: passes.flatMap((pass) => pass.requestFailures),
    a11y: {
      violations: uniqueA11y,
      uniqueViolations: uniqueA11y,
      byRule: summarizeA11yByRule(uniqueA11y),
      passes: passes.map((pass) => ({
        pass: pass.label,
        stats: pass.a11y ? pass.a11y.stats : null,
        headingOutline: pass.a11y ? pass.a11y.headingOutline : [],
        dialogs: pass.a11y ? pass.a11y.dialogs : [],
        violations: pass.a11y ? pass.a11y.violations : [],
      })),
    },
    layout: {
      overflows: passes
        .filter((pass) => pass.overflow && pass.overflow.hasOverflow)
        .map((pass) => ({ pass: pass.label, screenshot: pass.screenshot, ...pass.overflow })),
    },
    perf: primary ? primary.perf : null,
    focus: primary ? primary.focus : null,
    checks: primary && primary.checks ? primary.checks : null,
    baseline,
    artifacts: {
      outDir,
      reportJson: path.join(outDir, 'report.json'),
      reportMd: path.join(outDir, 'report.md'),
      screenshots: screenshotList,
      diffs: baseline ? baseline.comparisons.map((c) => c.diffPath).filter(Boolean) : [],
    },
    evidence: {
      screenshots: screenshotList,
      consoleErrors: passes.flatMap((pass) => pass.console.map((item) => ({ pass: item.pass, raw: item.raw, location: item.location }))),
      pageErrors: passes.flatMap((pass) => pass.pageErrors.map((item) => ({ pass: item.pass, message: item.message }))),
      requestFailures: passes.flatMap((pass) => pass.requestFailures.map((item) => ({ pass: item.pass, url: item.url, failure: item.failure }))),
      computedStyles: primary && primary.checks
        ? primary.checks.results
            .filter((result) => result.assertion === 'computed')
            .map((result) => ({ selector: result.selector, expected: result.expected, actual: result.actual, computed: result.evidence.computed }))
        : [],
      focusTabStops: primary ? (primary.focus ? primary.focus.tabStops : []) : [],
    },
  };
}

function summarizeA11yByRule(violations) {
  const map = new Map();
  for (const violation of violations) {
    const key = violation.rule;
    if (!map.has(key)) map.set(key, { rule: key, label: A11Y_RULE_LABELS[key] || key, count: 0, selectors: [], passes: [] });
    const row = map.get(key);
    row.count++;
    if (row.selectors.length < 8 && violation.selector && !row.selectors.includes(violation.selector)) {
      row.selectors.push(violation.selector);
    }
    for (const pass of violation.passes || (violation.pass ? [violation.pass] : [])) {
      if (!row.passes.includes(pass)) row.passes.push(pass);
    }
  }
  return [...map.values()];
}

function failureKey(failure) {
  switch (failure.category) {
    case 'console':
      return `console|${failure.detail}`;
    case 'runtime':
      return `pageerror|${failure.detail}`;
    case 'network':
      return `request|${failure.evidence && failure.evidence.request ? failure.evidence.request.url : failure.detail}`;
    case 'a11y':
      return `a11y|${failure.code}|${failure.selector || failure.detail}`;
    case 'layout':
      return `overflow|${String(failure.pass || '').split(' / ')[0]}`;
    case 'checks':
      return `check|${failure.selector}|${failure.detail}`;
    case 'baseline':
      return `baseline|${failure.pass}`;
    default:
      return `${failure.code}|${failure.detail}`;
  }
}

function dedupeFailures(rawFailures) {
  const map = new Map();
  for (const failure of rawFailures) {
    const key = failureKey(failure);
    if (!map.has(key)) {
      map.set(
        key,
        Object.assign({}, failure, {
          passes: failure.pass ? [failure.pass] : [],
          occurrences: 1,
          evidence: Object.assign({}, failure.evidence || {}),
        }),
      );
      continue;
    }
    const existing = map.get(key);
    existing.occurrences = (existing.occurrences || 1) + 1;
    if (failure.pass && !existing.passes.includes(failure.pass)) existing.passes.push(failure.pass);
    if (failure.evidence) {
      existing.evidence = existing.evidence || {};
      if (!existing.evidence.screenshot && failure.evidence.screenshot) {
        existing.evidence.screenshot = failure.evidence.screenshot;
      }
    }
  }
  return [...map.values()];
}

function dedupeA11yViolations(violations) {
  const map = new Map();
  for (const violation of violations) {
    const key = `${violation.rule}|${violation.selector}`;
    if (!map.has(key)) {
      map.set(key, Object.assign({}, violation, { passes: violation.pass ? [violation.pass] : [] }));
      continue;
    }
    const existing = map.get(key);
    if (violation.pass && !existing.passes.includes(violation.pass)) existing.passes.push(violation.pass);
  }
  return [...map.values()];
}

function printRunSummary(report, paths) {
  const lines = [];
  lines.push('');
  lines.push('=== frontend-verification 验证摘要 ===');
  lines.push(`目标 URL : ${report.url}`);
  lines.push(`结论     : ${report.verdict}（阻断项 ${report.summary.blocking}）`);
  lines.push(
    report.mode === 'quick'
      ? '模式     : quick（仅 360x800 / light；未跑性能/焦点/dialog/基线；quick PASS ≠ 完整验收）'
      : `模式     : full（并发 ${report.config.concurrency}）`,
  );
  lines.push(
    `统计     : 控制台错误 ${report.summary.consoleErrors} | 页面异常 ${report.summary.pageErrors} | 请求失败 ${report.summary.requestFailures} | a11y ${report.summary.a11yViolations} | 溢出视口 ${report.summary.overflowViewports} | 断言失败 ${report.summary.checkFailures} | 基线失败 ${report.summary.baselineFailures}`,
  );
  lines.push(`浏览器   : ${report.browser.name} ${report.browser.version}（${report.browser.launchStrategy}）`);
  lines.push(`报告     : ${paths.reportMdPath}`);
  lines.push(`机器可读 : ${paths.reportJsonPath}`);
  const failuresToShow = report.failures.slice(0, 15);
  if (failuresToShow.length) {
    lines.push('--- 阻断项（最多显示 15 条，按问题去重）---');
    for (const failure of failuresToShow) {
      const passes = failure.passes && failure.passes.length > 1 ? `（${failure.passes.join('，')}）` : `  @ ${failure.pass || '-'}`;
      lines.push(`- [${failure.code}] ${failure.title}${passes}`);
    }
    if (report.failures.length > failuresToShow.length) lines.push(`... 其余 ${report.failures.length - failuresToShow.length} 条见 report.md`);
  }
  if (report.warnings.length) {
    lines.push(`警告 ${report.warnings.length} 条，见 report.md`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

// ---------------------------------------------------------------------------
// Markdown 报告
// ---------------------------------------------------------------------------

function mdCode(value) {
  return `\`${String(value).replace(/`/g, '\\`')}\``;
}

function fmtLocalTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function mdCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function mdTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.map(mdCell).join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) lines.push(`| ${row.map(mdCell).join(' | ')} |`);
  return lines.join('\n');
}

function buildRunMarkdown(report) {
  const lines = [];
  const push = (...parts) => lines.push(...parts);
  push(`# 前端验证报告：${report.verdict === 'PASS' ? '通过' : '未通过'}${report.mode === 'quick' ? '（快速模式）' : ''}`, '');
  const viewportList = [...new Set(report.passes.map((pass) => pass.viewport))].join(',');
  const themeList = [...new Set(report.passes.map((pass) => pass.theme))].join(',');
  push(
    mdTable(
      ['项目', '内容'],
      [
        ['目标 URL', report.url],
        ['结论', `**${report.verdict}**（阻断项 ${report.summary.blocking}）`],
        ['模式', report.mode === 'quick' ? 'quick（360x800 / light，仅开发内循环；**不是完整验收**）' : `full（并发 ${report.config.concurrency}）`],
        ['执行时间', `${fmtLocalTime(report.startedAt)} → ${fmtLocalTime(report.finishedAt)}（本地时间，耗时 ${Math.round(report.durationMs / 1000)}s）`],
        ['耗时明细', report.timings ? `启动 ${report.timings.launchMs}ms / 采集 ${report.timings.passesMs}ms / 基线 ${report.timings.baselineMs}ms` : '未记录'],
        ['浏览器', `${report.browser.name} ${report.browser.version}，启动方式 ${mdCode(report.browser.launchStrategy)}`],
        ['视口 × 主题', report.passes.map((pass) => `${pass.viewport}/${pass.theme}`).join('，')],
        ['主采集视口', report.primaryPass],
        ['基线目录', report.config.baselineDir ? mdCode(report.config.baselineDir) : '未使用'],
        ['断言文件', report.config.checksFile ? mdCode(report.config.checksFile) : '未提供'],
      ],
    ),
    '',
  );

  push('## 结论', '');
  if (report.mode === 'quick') {
    push('> **快速模式（quick）**：只采集 360x800 / light，跳过性能、键盘焦点、对话框行为与基线矩阵。PASS 仅表示本模式无阻断项，**不能替代完整验收**；发布前必须再跑完整模式。', '');
  }
  if (report.verdict === 'PASS') {
    push('本次真实浏览器验收未发现阻断项。以下证据均由 Playwright 在真实浏览器中采集，不是模型自述。', '');
  } else {
    push(
      `共 **${report.failures.length}** 个阻断项（同问题跨视口/主题已去重；原始失败事件 ${report.failureEvents} 条），修复后必须重新执行本命令，直到结论为 PASS。`,
      '',
    );
    push(
      mdTable(
        ['#', '类型', '出现阶段', '问题', '证据截图'],
        report.failures.map((failure, index) => [
          index + 1,
          failure.code,
          failure.passes && failure.passes.length ? failure.passes.join('，') : failure.pass || '-',
          `${failure.title}`,
          failure.evidence && failure.evidence.screenshot ? failure.evidence.screenshot : '-',
        ]),
      ),
      '',
    );
  }

  push('## 控制台与网络', '');
  const groupBy = (items, keyFn, mapFn) => {
    const map = new Map();
    for (const item of items) {
      const key = keyFn(item);
      if (!map.has(key)) map.set(key, { passes: [], item });
      const row = map.get(key);
      if (!row.passes.includes(item.pass)) row.passes.push(item.pass);
    }
    return [...map.values()].map((row) => mapFn(row));
  };
  const consoleRows = groupBy(
    report.evidence.consoleErrors,
    (item) => item.raw,
    (row) => [row.passes.join('，'), 'console.error', row.item.raw],
  );
  const pageErrorRows = groupBy(
    report.evidence.pageErrors,
    (item) => item.message,
    (row) => [row.passes.join('，'), 'pageerror', row.item.message],
  );
  const requestRows = groupBy(
    report.evidence.requestFailures,
    (item) => `${item.url}|${item.failure}`,
    (row) => [row.passes.join('，'), 'requestfailed', `${row.item.url}（${row.item.failure}）`],
  );
  if (consoleRows.length + pageErrorRows.length + requestRows.length === 0) {
    push('未采集到 console.error / pageerror / 请求失败。', '');
  } else {
    push(mdTable(['出现阶段', '类型', '原文'], [...consoleRows, ...pageErrorRows, ...requestRows]), '');
  }

  push('## 可访问性（a11y）', '');
  if (!report.a11y.uniqueViolations.length) {
    push('未发现自动断言覆盖的 a11y 问题（img alt、可访问名称、label、重复 id、标题层级、aria-hidden 聚焦、dialog 语义）。', '');
  } else {
    push(mdTable(
      ['规则', '问题数', '出现阶段', '选择器'],
      report.a11y.byRule.map((row) => [row.label, row.count, row.passes.join('，'), row.selectors.join('，')]),
    ), '');
    push('逐条明细（含 HTML 证据；跨视口/主题已去重）：', '');
    push(
      mdTable(
        ['规则', '选择器', '出现阶段', '说明', 'HTML'],
        report.a11y.uniqueViolations.map((violation) => [
          violation.rule,
          violation.selector,
          (violation.passes || [violation.pass]).join('，'),
          violation.detail,
          (violation.evidence && violation.evidence.html) || '',
        ]),
      ),
      '',
    );
  }

  push('## 横向溢出与响应式', '');
  if (!report.layout.overflows.length) {
    push('所有采集视口均未出现横向溢出（documentElement.scrollWidth ≤ 视口宽 + 1）。', '');
  } else {
    for (const overflow of report.layout.overflows) {
      push(
        `- ${overflow.pass}：文档宽 ${overflow.scrollWidth}px > 视口 ${overflow.viewportWidth}px；溢出元素：${overflow.offenders
          .map((offender) => `${mdCode(offender.selector)}（right=${offender.right}px, width=${offender.width}px）`)
          .join('，')}`,
      );
    }
    push('');
  }

  push('## 断言检查（checks DSL）', '');
  if (!report.checks) {
    push('未提供 --checks 断言文件。', '');
  } else {
    push(mdTable(
      ['#', '断言', '选择器', '期望', '实际', '结果'],
      report.checks.results.map((result) => [
        result.index + 1,
        result.assertion,
        result.selector || '-',
        result.expected,
        result.actual,
        result.ok ? 'PASS' : 'FAIL',
      ]),
    ), '');
  }

  push('## 性能指标（主采集视口）', '');
  if (report.perf) {
    const perf = report.perf;
    push(mdTable(
      ['指标', '值'],
      [
        ['TTFB', perf.ttfb === null ? 'n/a' : `${perf.ttfb} ms`],
        ['DOMContentLoaded', perf.domContentLoaded === null ? 'n/a' : `${perf.domContentLoaded} ms`],
        ['Load', perf.load === null ? 'n/a' : `${perf.load} ms`],
        ['FCP', perf.fcp === null ? 'n/a' : `${perf.fcp} ms`],
        ['LCP', perf.lcp === null ? 'n/a' : `${perf.lcp} ms（元素 ${perf.lcpElement || '未知'}）`],
        ['CLS', perf.cls === null ? 'n/a' : String(perf.cls)],
        ['Long Task 数量', perf.longTasks === null ? 'n/a' : String(perf.longTasks)],
        ['资源请求数 / 传输字节', `${perf.resourceCount} / ${perf.transferSize}`],
      ],
    ), '');
    push('> 说明：CLS 为 `layout-shift` 且 `hadRecentInput=false` 的累计值（近似口径）；LCP 由 PerformanceObserver 在页面加载期间采集。', '');
  } else {
    push('未采集性能指标。', '');
  }

  push('## 键盘焦点走查', '');
  for (const walk of [report.focus, ...report.passes.filter((pass) => pass.label === report.primaryPass).map((pass) => pass.focusAfterDialog)]) {
    if (!walk) continue;
    push(`### ${walk.label}`, '');
    if (!walk.tabStops.length) {
      push('- 未走查到可获得焦点的元素。', '');
      continue;
    }
    push(mdTable(
      ['#', '元素', '可访问名称', '焦点环', 'outline / box-shadow'],
      walk.tabStops.map((stop) => [
        stop.index + 1,
        stop.selector,
        stop.name || '(空)',
        stop.visibleRing ? '可见' : '不可见',
        `${stop.outline}${stop.boxShadow && stop.boxShadow !== 'none' ? ` / ${stop.boxShadow}` : ''}`,
      ]),
    ), '');
    if (walk.missingRings.length) push(`- 无可见焦点环：${walk.missingRings.map((item) => item.selector).join('，')}`, '');
  }

  push('## 对话框行为', '');
  for (const pass of report.passes) {
    if (!pass.dialog) continue;
    push(
      `- ${pass.label}：找到 dialog=${pass.dialog.found ? '是' : '否'}，打开=${pass.dialog.open ? '是' : '否'}，模态=${pass.dialog.modal ? '是' : '否'}，Escape 关闭=${pass.dialog.escapeCloses === null ? 'n/a' : pass.dialog.escapeCloses ? '是' : '否'}，关闭按钮关闭=${pass.dialog.closeButtonCloses === null ? 'n/a' : pass.dialog.closeButtonCloses ? '是' : '否'}`,
    );
  }
  if (!report.passes.some((pass) => pass.dialog)) push('未采集对话框行为（页面中没有 dialog 或不在主采集视口）。', '');
  push('');

  push('## 基线像素对比', '');
  if (!report.baseline) {
    push('未使用 --baseline。', '');
  } else if (!report.baseline.comparisons.length) {
    push('基线目录中没有任何可比对截图。', '');
  } else {
    push(mdTable(
      ['截图', '差异像素', '差异占比', '阈值', '结果', 'diff 图'],
      report.baseline.comparisons.map((comparison) => [
        comparison.name,
        comparison.skipped ? '-' : `${comparison.diffPixels}/${comparison.totalPixels}`,
        comparison.skipped ? '-' : `${comparison.diffPercent}%`,
        `${report.config.pixelThresholdPercent}%`,
        comparison.skipped ? '跳过' : comparison.ok ? 'PASS' : 'FAIL',
        comparison.diffPath || '-',
      ]),
    ), '');
  }

  push('## 截图证据', '');
  push(mdTable(['阶段', '截图绝对路径'], report.artifacts.screenshots.map((screenshot) => {
    const pass = report.passes.find((item) => item.screenshot === screenshot);
    return [pass ? `${pass.viewport}/${pass.theme}` : '-', screenshot];
  })), '');

  push('## 复现命令', '');
  const quoteArg = (value) => {
    const text = String(value);
    return /[\s"]/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
  };
  const cmdParts = ['node', report.tool.script, 'run', '--url', report.url, '--out', report.artifacts.outDir];
  if (report.config.quick) {
    cmdParts.push('--quick');
  } else {
    cmdParts.push('--viewports', viewportList, '--theme', themeList);
    if (report.config.concurrency) cmdParts.push('--concurrency', String(report.config.concurrency));
  }
  if (report.config.checksFile) cmdParts.push('--checks', report.config.checksFile);
  if (report.config.baselineDir) cmdParts.push('--baseline', report.config.baselineDir);
  push('```powershell', cmdParts.map(quoteArg).join(' '), '```', '');

  push('## 环境与限制', '');
  push(`- 浏览器：${report.browser.name} ${report.browser.version}（${report.browser.launchStrategy}，headless=${report.browser.headless}）`);
  push(`- 等待策略：加载后额外等待 ${report.config.settleMs} ms；截图 animations=disabled、caret=hide。`);
  push('- 本报告只包含真实浏览器可采集的证据；没有 mock 页面、没有伪造结论。');
  if (report.warnings.length) {
    push('', '### 警告', '');
    for (const warning of report.warnings) push(`- [${warning.code}] ${warning.detail}`);
  }
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// 其它子命令
// ---------------------------------------------------------------------------

async function cmdShot(opts) {
  const url = normalizeUrl(requireOpt(opts, 'url'));
  const out = path.resolve(requireOpt(opts, 'out'));
  const viewport = parseViewport(opts.viewport || '1440x900');
  const theme = parseTheme(opts.theme || 'light');
  const settleMs = intOpt(opts, 'wait', 400);
  const timeout = intOpt(opts, 'timeout', 30000);
  ensureDir(path.dirname(out));

  const playwright = await loadPlaywright();
  const launched = await launchBrowser(playwright, opts);
  try {
    const { context, page } = await openPage({
      browser: launched.browser,
      url,
      viewport,
      theme,
      timeout,
      waitFor: opts['wait-for'],
      settleMs,
    });
    try {
      await page.screenshot({
        path: out,
        fullPage: !!opts['full-page'],
        animations: 'disabled',
        caret: 'hide',
      });
    } finally {
      await context.close().catch(() => {});
    }
  } finally {
    await launched.browser.close().catch(() => {});
  }
  const bytes = fs.statSync(out).size;
  printJson({
    ok: true,
    command: 'shot',
    url,
    path: out,
    bytes,
    viewport: { width: viewport.width, height: viewport.height },
    theme,
    fullPage: !!opts['full-page'],
    browser: launched.meta,
  });
  return EXIT.PASS;
}

async function cmdA11y(opts) {
  const url = normalizeUrl(requireOpt(opts, 'url'));
  const viewport = parseViewport(opts.viewport || '1440x900');
  const theme = parseTheme(opts.theme || 'light');
  const settleMs = intOpt(opts, 'wait', 400);
  const timeout = intOpt(opts, 'timeout', 30000);
  const outDir = path.resolve(opts.out || defaultOutDir('a11y'));
  ensureDir(outDir);

  const playwright = await loadPlaywright();
  const launched = await launchBrowser(playwright, opts);
  let scan;
  try {
    const { context, page } = await openPage({ browser: launched.browser, url, viewport, theme, timeout, settleMs });
    try {
      scan = await page.evaluate(scanAccessibility);
    } finally {
      await context.close().catch(() => {});
    }
  } finally {
    await launched.browser.close().catch(() => {});
  }

  const output = {
    url,
    command: 'a11y',
    viewport: { width: viewport.width, height: viewport.height },
    theme,
    browser: launched.meta,
    stats: scan.stats,
    headingOutline: scan.headingOutline,
    dialogs: scan.dialogs,
    violations: scan.violations,
    counts: { violations: scan.violations.length },
    outDir,
  };
  const jsonPath = path.join(outDir, 'a11y.json');
  output.artifacts = { json: jsonPath };
  writeJsonFile(jsonPath, output);
  printJson(output);
  if (scan.violations.length > 0 && !opts['no-fail']) return EXIT.FAIL;
  return EXIT.PASS;
}

async function cmdPerf(opts) {
  const url = normalizeUrl(requireOpt(opts, 'url'));
  const viewport = parseViewport(opts.viewport || '1440x900');
  const theme = parseTheme(opts.theme || 'light');
  const settleMs = intOpt(opts, 'wait', 600);
  const timeout = intOpt(opts, 'timeout', 30000);

  const playwright = await loadPlaywright();
  const launched = await launchBrowser(playwright, opts);
  let metrics;
  try {
    const { context, page } = await openPage({ browser: launched.browser, url, viewport, theme, timeout, settleMs });
    try {
      metrics = await collectPerf(page);
    } finally {
      await context.close().catch(() => {});
    }
  } finally {
    await launched.browser.close().catch(() => {});
  }

  printJson({
    url,
    command: 'perf',
    viewport: { width: viewport.width, height: viewport.height },
    theme,
    browser: launched.meta,
    metrics,
  });
  return EXIT.PASS;
}

async function cmdCompare(opts) {
  const fileA = path.resolve(requireOpt(opts, 'a'));
  const fileB = path.resolve(requireOpt(opts, 'b'));
  if (!fs.existsSync(fileA)) throw usageError(`图片不存在: ${fileA}`);
  if (!fs.existsSync(fileB)) throw usageError(`图片不存在: ${fileB}`);
  const threshold = numOpt(opts, 'threshold', 0.1);

  const bufferA = fs.readFileSync(fileA);
  const bufferB = fs.readFileSync(fileB);

  let comparison;
  let browserMeta = null;
  if (bufferA.equals(bufferB)) {
    comparison = {
      identical: true,
      sizeMismatch: false,
      diffPixels: 0,
      totalPixels: 0,
      diffPercent: 0,
      dataUrl: null,
    };
  } else {
    const playwright = await loadPlaywright();
    const launched = await launchBrowser(playwright, opts);
    browserMeta = launched.meta;
    try {
      const page = await launched.browser.newPage();
      comparison = await compareImages(page, bufferA, bufferB, { channelThreshold: 32 });
      await page.close().catch(() => {});
    } finally {
      await launched.browser.close().catch(() => {});
    }
  }

  let diffPath = null;
  if (comparison.dataUrl) {
    if (opts.out) {
      diffPath = path.resolve(opts.out);
    } else {
      diffPath = path.join(defaultOutDir('compare'), 'diff.png');
    }
    writeDiffImage(diffPath, comparison.dataUrl);
  } else if (opts.out) {
    // 两张图完全一致时不生成 diff 图（避免输出一个不存在的路径）
    ensureDir(path.dirname(path.resolve(opts.out)));
  }

  const result = {
    command: 'compare',
    a: fileA,
    b: fileB,
    identical: comparison.identical,
    sizeMismatch: comparison.sizeMismatch,
    widthA: comparison.widthA,
    heightA: comparison.heightA,
    widthB: comparison.widthB,
    heightB: comparison.heightB,
    diffPixels: comparison.diffPixels,
    totalPixels: comparison.totalPixels,
    diffPercent: comparison.diffPercent,
    thresholdPercent: threshold,
    pass: !comparison.sizeMismatch && comparison.diffPercent <= threshold,
    diffPath,
    browser: browserMeta,
  };
  printJson(result);
  if (!result.pass && !opts['no-fail']) return EXIT.FAIL;
  return EXIT.PASS;
}

// ---------------------------------------------------------------------------
// 帮助
// ---------------------------------------------------------------------------

function printHelp() {
  const text = `frontend-verification verify.mjs v${TOOL_VERSION}
真实浏览器验收工具（零 npm 依赖，需要本机已安装 Playwright）。

用法：node scripts/verify.mjs <command> [options]

命令：
  run      多视口 × 明暗主题截图 + 控制台/异常/请求失败 + a11y + 横向溢出 + 性能 + 键盘焦点 + checks + baseline，输出 report.json / report.md
  shot     单张截图
  a11y     仅可访问性检查
  perf     仅输出性能指标 JSON
  compare  两张图片像素差异

run 选项：
  --url <http|file url>        必填，目标页面（也接受本地文件路径）
  --out <dir>                  输出目录（默认系统临时目录）
  --checks <file>              断言 JSON 文件（见 SKILL.md 的 checks DSL）
  --baseline <dir>             基线截图目录（按同名截图逐张比较；quick 模式不可用）
  --viewports <WxH,...>        默认 360x800,768x1024,1440x900
  --theme <light,dark>         默认 light,dark
  --quick                      快速通道：固定 360x800 / light，跳过性能/焦点/dialog/基线；PASS ≠ 完整验收
  --concurrency <1-8>          视口×主题并发数（默认 min(4, 采集数)；quick 固定 1）
  --pixel-threshold <percent>  基线差异阈值，默认 0.1
  --channel-threshold <0-255>  单通道像素差阈值，默认 32
  --wait <ms>                  加载后额外等待，默认 400
  --wait-for <selector>        等待某个选择器出现
  --timeout <ms>              导航超时，默认 30000
  --browser <name|path>        chromium（默认）| chrome | msedge | firefox | webkit | 可执行文件路径
  --headed                     显示浏览器窗口
  --no-fail                    有阻断项也以退出码 0 结束（报告仍为 FAIL）

shot 选项：
  --url <url> --out <file>     必填
  --viewport <WxH>             默认 1440x900
  --theme <light|dark>         默认 light
  --full-page                  截整页（默认只截视口）
  --wait <ms> / --wait-for <selector> / --timeout <ms> / --browser / --headed

a11y 选项：
  --url <url>  --out <dir>  --viewport <WxH>  --theme <light|dark>  --no-fail  --wait  --timeout  --browser

perf 选项：
  --url <url>  --viewport <WxH>  --theme <light|dark>  --wait  --timeout  --browser

compare 选项：
  --a <png> --b <png>  --out <diff.png>  --threshold <percent>  --no-fail

退出码：0 = 通过；1 = 验证失败（有阻断项）；2 = 工具/参数错误。

示例：
  node scripts/verify.mjs run --url "file:///C:/work/page/index.html" --checks checks.json --out .\\verify\\out
  node scripts/verify.mjs run --url "http://localhost:5173/" --quick --checks checks.json
  node scripts/verify.mjs run --url "http://localhost:5173/" --baseline .\\verify\\baseline --no-fail
  node scripts/bench-verify.mjs --url "http://localhost:5173/" --runs 3 --label after
  node scripts/verify.mjs shot --url "http://localhost:5173/" --out .\\verify\\dark.png --theme dark --viewport 1440x900
  node scripts/verify.mjs a11y --url "http://localhost:5173/"
  node scripts/verify.mjs perf --url "http://localhost:5173/"
  node scripts/verify.mjs compare --a .\\verify\\before.png --b .\\verify\\after.png --out .\\verify\\diff.png
`;
  process.stdout.write(text);
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

const COMMANDS = {
  run: cmdRun,
  shot: cmdShot,
  a11y: cmdA11y,
  perf: cmdPerf,
  compare: cmdCompare,
};

async function main(argv) {
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    printHelp();
    return EXIT.PASS;
  }
  const command = argv[0];
  if (!COMMANDS[command]) throw usageError(`未知子命令: ${command}（可选 run | shot | a11y | perf | compare）`);
  const { opts } = parseArgv(argv.slice(1), command);
  if (opts.help) {
    printHelp();
    return EXIT.PASS;
  }
  return COMMANDS[command](opts);
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    const code = err instanceof CliError ? err.exitCode : EXIT.TOOL;
    process.stderr.write(`\n[${TOOL_NAME}] 失败: ${err && err.message ? err.message : String(err)}\n`);
    if (process.env.FE_VERIFY_DEBUG && err && err.stack) process.stderr.write(`${err.stack}\n`);
    process.exit(code);
  });
