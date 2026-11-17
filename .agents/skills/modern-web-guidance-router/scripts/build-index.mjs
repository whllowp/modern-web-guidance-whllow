#!/usr/bin/env node
/**
 * build-index.mjs — regenerate the offline knowledge index for the
 * modern-web-guidance-router skill.
 *
 * Zero dependencies. Scans the repository's local knowledge assets:
 *   skills/modern-web-guidance/guides/**\/*.md          (209 use-case + discipline guides)
 *   skills/chrome-extensions/references/**\/*.md        (22 extension/webstore references)
 *   skills/chrome-extensions/SKILL.md                   (extension discipline guide)
 *   README.md (injected coverage section)                (203 curated descriptions + 250 feature catalog)
 *   references/aliases.json, references/zh-glossary.json (hand-curated routing vocabulary)
 *
 * Writes:
 *   references/index.json        machine index used by scripts/mwg.mjs
 *   references/intent-routes.md  generated human routing table (do not edit by hand)
 *
 * Usage:
 *   node scripts/build-index.mjs            # rebuild
 *   node scripts/build-index.mjs --check    # exit 1 when the index is stale
 *   node scripts/build-index.mjs --stats    # print stats only
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..');
const REF_DIR = path.join(SKILL_DIR, 'references');
const INDEX_FILE = path.join(REF_DIR, 'index.json');
const ROUTES_FILE = path.join(REF_DIR, 'intent-routes.md');
const ARGS = new Set(process.argv.slice(2));

const DISCIPLINE = new Set([
  'accessibility/accessibility',
  'css/css',
  'forms/forms',
  'html/html',
  'performance/performance',
  'privacy/privacy',
  'security/security',
  'ui-behaviors/motion',
  'visual-design/color',
  'visual-design/typography',
  'visual-design/visual-effects',
  'webmcp/webmcp',
]);

const CATEGORY_LABELS = {
  accessibility: '可访问性',
  'built-in-ai': '浏览器内置 AI',
  css: 'CSS 与布局',
  forms: '表单与输入',
  html: 'HTML 与 DOM',
  js: 'JavaScript 与日期时间',
  performance: '性能',
  privacy: '隐私',
  pwa: 'PWA 安装',
  security: '安全与凭证',
  'ui-atoms': 'UI 微件',
  'ui-behaviors': 'UI 行为与动效',
  'ui-components': 'UI 组件',
  'user-experience': '用户体验',
  'visual-design': '视觉设计',
  wasm: 'WebAssembly',
  webmcp: 'WebMCP（AI Agent 工具化）',
  'chrome-extensions': 'Chrome 扩展',
};

function fail(message) {
  console.error(`build-index: ${message}`);
  process.exit(1);
}

function findRepoRoot(start) {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'skills', 'modern-web-guidance', 'guides'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (process.env.MWG_ROOT) {
    const envRoot = path.resolve(process.env.MWG_ROOT);
    if (fs.existsSync(path.join(envRoot, 'skills', 'modern-web-guidance', 'guides'))) return envRoot;
  }
  fail('cannot locate the modern-web-guidance repository (no skills/modern-web-guidance/guides found above this skill). Set MWG_ROOT to override.');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function posix(p) {
  return p.split(path.sep).join('/');
}

function firstHeading(text) {
  const m = text.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
}

function headings(text) {
  const found = [];
  for (const m of text.matchAll(/^(#{1,3})\s+(.+)$/gm)) {
    if (m[1].length === 1) continue;
    found.push(m[2].trim());
  }
  return found;
}

function relatedIds(text) {
  const ids = new Set();
  for (const m of text.matchAll(/retrieve\s+"([a-z0-9][a-z0-9-]*)"/g)) ids.add(m[1]);
  return [...ids];
}

/** Fallback description: first prose paragraph after the title (skips frontmatter, code, lists). */
function deriveDescription(text) {
  const lines = text.split(/\r?\n/);
  let started = false;
  const buf = [];
  for (const line of lines) {
    const t = line.trim();
    if (!started) {
      if (/^#\s+/.test(t)) { started = true; continue; }
      continue;
    }
    if (!t) { if (buf.length) break; continue; }
    if (/^#{2,}\s/.test(t)) { if (buf.length) break; continue; }
    if (/^([-*]|\d+\.|```|\||<)/.test(t)) { if (buf.length) break; continue; }
    buf.push(t);
  }
  const paragraph = buf.join(' ');
  if (paragraph.length < 12) {
    const overview = text.match(/##\s+Overview\s*\n+([^\n#].{10,400})/);
    if (overview) return overview[1].trim();
    return '';
  }
  return paragraph.length > 320 ? `${paragraph.slice(0, 317)}...` : paragraph;
}

function normalizeText(text, maxChars = 1200) {
  let t = text
    .replace(/```[a-z0-9-]*\n/gi, ' ')
    .replace(/```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`>|#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > maxChars ? t.slice(0, maxChars) : t;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`cannot parse ${file}: ${error.message}`);
  }
}

function parseReadme(root) {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const start = readme.indexOf('<!-- INJECT_SKILL_COVERAGE_START -->');
  const end = readme.indexOf('<!-- INJECT_SKILL_COVERAGE_END -->');
  const section = start >= 0 && end > start ? readme.slice(start, end) : readme;

  const useCases = new Map();
  const features = [];
  let category = '';
  let featureGroup = '';
  for (const line of section.split(/\r?\n/)) {
    const h3 = line.match(/^<h3>([^<]+)<\/h3>\s*$/);
    if (h3) { category = h3[1].trim(); featureGroup = ''; continue; }
    const h = line.match(/^#{2,3}\s+(.+)$/);
    if (h) { category = ''; featureGroup = h[1].trim(); continue; }
    const uc = line.match(/^- \*\*\[([^\]]+)\]\(([^)]+)\)\*\*:\s*(.+)$/);
    if (uc) useCases.set(uc[1].trim(), { description: uc[3].trim(), url: uc[2].trim(), category });
    if (featureGroup && line.trim().startsWith('|')) {
      for (const feat of line.matchAll(/\[([^\]]+)\]\((https:\/\/web-platform-dx\.github\.io[^)]+)\)/g)) {
        const name = feat[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
        if (name) features.push({ name, group: featureGroup, url: feat[2].trim() });
      }
    }
  }
  return { useCases, features };
}

function readSkillVersion(root) {
  const skillFile = path.join(root, 'skills', 'modern-web-guidance', 'SKILL.md');
  if (!fs.existsSync(skillFile)) return null;
  const m = fs.readFileSync(skillFile, 'utf8').match(/--skill-version\s+(\S+)/);
  return m ? m[1] : null;
}

function build() {
  const root = findRepoRoot(SKILL_DIR);
  const { useCases, features } = parseReadme(root);
  const aliases = readJson(path.join(REF_DIR, 'aliases.json'), {});
  const glossary = readJson(path.join(REF_DIR, 'zh-glossary.json'), {});
  const skillVersion = readSkillVersion(root);

  const guidesDir = path.join(root, 'skills', 'modern-web-guidance', 'guides');
  const guides = [];
  const missingDescriptions = [];
  for (const file of walk(guidesDir).sort()) {
    const relGuide = posix(path.relative(guidesDir, file)).replace(/\.md$/, '');
    const id = path.basename(file, '.md');
    const category = path.basename(path.dirname(file));
    const raw = fs.readFileSync(file, 'utf8');
    const relPath = posix(path.relative(root, file));
    const useCase = useCases.get(id);
    let description = useCase && useCase.description ? useCase.description : deriveDescription(raw);
    if (!description) {
      description = firstHeading(raw) || id;
      missingDescriptions.push(id);
    }
    const alias = aliases[id] || {};
    guides.push({
      id,
      owner: 'modern-web-guidance',
      category,
      discipline: DISCIPLINE.has(relGuide),
      path: relPath,
      title: firstHeading(raw) || id,
      description,
      headings: headings(raw).slice(0, 40),
      related: relatedIds(raw),
      aliases: { zh: alias.zh || [], en: alias.en || [] },
      text: normalizeText(raw),
      lines: raw.split(/\r?\n/).length,
      bytes: Buffer.byteLength(raw, 'utf8'),
    });
  }

  const knownIds = new Set(guides.map((g) => g.id));
  for (const id of useCases.keys()) {
    if (!knownIds.has(id)) missingDescriptions.push(`README-only:${id}`);
  }

  // Chrome extensions: discipline skill + references.
  const chromeSkillFile = path.join(root, 'skills', 'chrome-extensions', 'SKILL.md');
  const chromeAssets = [];
  const chromeAlias = (id) => {
    const a = aliases[`chrome:${id}`] || aliases[id] || {};
    return { zh: a.zh || [], en: a.en || [] };
  };
  if (fs.existsSync(chromeSkillFile)) {
    const raw = fs.readFileSync(chromeSkillFile, 'utf8');
    chromeAssets.push({
      id: 'chrome-extensions',
      owner: 'chrome-extensions',
      group: 'skill',
      path: posix(path.relative(root, chromeSkillFile)),
      title: firstHeading(raw) || 'Chrome Extensions',
      description: deriveDescription(raw),
      headings: headings(raw).slice(0, 40),
      aliases: chromeAlias('chrome-extensions'),
      text: normalizeText(raw),
      lines: raw.split(/\r?\n/).length,
      bytes: Buffer.byteLength(raw, 'utf8'),
    });
  }
  const chromeRefDir = path.join(root, 'skills', 'chrome-extensions', 'references');
  if (fs.existsSync(chromeRefDir)) {
    for (const file of walk(chromeRefDir).sort()) {
      const raw = fs.readFileSync(file, 'utf8');
      const id = path.basename(file, '.md');
      chromeAssets.push({
        id,
        owner: 'chrome-extensions',
        group: path.basename(path.dirname(file)),
        path: posix(path.relative(root, file)),
        title: firstHeading(raw) || id,
        description: deriveDescription(raw),
        headings: headings(raw).slice(0, 24),
        aliases: chromeAlias(id),
        text: normalizeText(raw, 8000),
        lines: raw.split(/\r?\n/).length,
        bytes: Buffer.byteLength(raw, 'utf8'),
      });
    }
  }

  const categories = new Map();
  for (const g of guides) {
    const c = categories.get(g.category) || { id: g.category, label: CATEGORY_LABELS[g.category] || g.category, count: 0, guides: [] };
    c.count += 1;
    c.guides.push(g.id);
    categories.set(g.category, c);
  }

  const index = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repo: {
      name: 'modern-web-guidance',
      version: readJson(path.join(root, 'package.json'), {}).version || null,
      skillVersion,
      root,
    },
    counts: {
      guides: guides.length,
      useCases: useCases.size,
      disciplines: guides.filter((g) => g.discipline).length,
      categories: categories.size,
      chromeAssets: chromeAssets.length,
      chromeRefs: chromeAssets.filter((a) => a.group !== 'skill').length,
      features: features.length,
      glossaryTerms: Object.keys(glossary).length,
      aliasedGuides: guides.filter((g) => g.aliases.zh.length || g.aliases.en.length).length,
    },
    categories: [...categories.values()].sort((a, b) => a.id.localeCompare(b.id)),
    guides,
    chrome: chromeAssets,
    features,
    glossary,
    missingDescriptions,
  };

  const fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify({ counts: index.counts, guides, chrome: chromeAssets, features, glossary }))
    .digest('hex')
    .slice(0, 24);
  index.fingerprint = fingerprint;

  if (ARGS.has('--stats')) {
    printStats(index);
    return;
  }

  if (ARGS.has('--check')) {
    let existing = null;
    try {
      existing = fs.existsSync(INDEX_FILE) ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) : null;
    } catch {
      existing = null;
    }
    if (!existing || existing.fingerprint !== fingerprint) {
      console.error('build-index: index is stale — run `node scripts/build-index.mjs` to regenerate.');
      process.exit(1);
    }
    console.log(`build-index: index is fresh (fingerprint ${fingerprint}, ${index.counts.guides} guides, ${index.counts.chromeAssets} chrome assets).`);
    return;
  }

  const serialized = `${JSON.stringify(index)}\n`;
  fs.mkdirSync(REF_DIR, { recursive: true });
  fs.writeFileSync(INDEX_FILE, serialized);
  fs.writeFileSync(ROUTES_FILE, renderRoutes(index));
  printStats(index);
  if (missingDescriptions.length) {
    console.log(`build-index: ${missingDescriptions.length} entries used a derived description: ${missingDescriptions.slice(0, 12).join(', ')}${missingDescriptions.length > 12 ? ' …' : ''}`);
  }
}

function renderRoutes(index) {
  const out = [];
  out.push('# Intent routes — 意图 → 指南 id（自动生成）');
  out.push('');
  out.push('<!-- 由 scripts/build-index.mjs 生成，请勿手改。人工维护的触发词在 references/aliases.json（按 id）与 references/zh-glossary.json（中文→英文词表）。 -->');
  out.push('');
  out.push(`索引时间：${index.generatedAt} · 指南 ${index.counts.guides} 篇 · 分类 ${index.counts.categories} 个 · 中文词表 ${index.counts.glossaryTerms} 条`);
  out.push('');
  out.push('> 检索：`node scripts/mwg.mjs search "<中文或英文意图>"` 会同时使用下列触发词、标题、描述与正文。');
  out.push('');
  for (const category of index.categories) {
    out.push(`## ${category.label}（${category.id}，${category.count} 篇）`);
    out.push('');
    out.push('| id | 标题 | 中文触发词 | 描述 |');
    out.push('| :--- | :--- | :--- | :--- |');
    for (const id of category.guides) {
      const g = index.guides.find((x) => x.id === id);
      if (!g) continue;
      const zh = g.aliases.zh.slice(0, 6).join('、');
      const desc = g.description.replace(/\|/g, '\\|');
      out.push(`| \`${g.id}\` | ${g.title.replace(/\|/g, '\\|')} | ${zh || '—'} | ${desc.length > 150 ? `${desc.slice(0, 147)}…` : desc} |`);
    }
    out.push('');
  }
  out.push('## Chrome 扩展（独立技能包）');
  out.push('');
  out.push('| id | 分组 | 说明 |');
  out.push('| :--- | :--- | :--- |');
  for (const a of index.chrome) {
    out.push(`| \`${a.id}\` | ${a.group} | ${a.description.replace(/\|/g, '\\|').slice(0, 140)} |`);
  }
  out.push('');
  return out.join('\n');
}

function printStats(index) {
  const cats = index.categories.map((c) => `${c.id}:${c.count}`).join(' ');
  console.log(`build-index: ${index.counts.guides} guides (${index.counts.disciplines} discipline) · ${index.counts.categories} categories`);
  console.log(`  categories: ${cats}`);
  console.log(`  chrome: ${index.counts.chromeAssets} assets (${index.counts.chromeRefs} references + skill)`);
  console.log(`  features: ${index.counts.features} · glossary: ${index.counts.glossaryTerms} terms · aliased: ${index.counts.aliasedGuides} guides`);
  console.log(`  skill-version: ${index.repo.skillVersion || 'unknown'} · repo root: ${index.repo.root}`);
  console.log(`  index: ${INDEX_FILE}`);
}

build();
