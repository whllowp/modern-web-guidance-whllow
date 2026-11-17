#!/usr/bin/env node
/**
 * selftest.mjs — regression battery for the offline router.
 *
 * Runs the bilingual cases in references/selftest-cases.json and checks that at
 * least one expected guide id appears in the top results. Exits non-zero on
 * regression so a maintenance pass can prove the index/lexicon still routes.
 *
 * Usage: node scripts/selftest.mjs [--limit 3] [--verbose]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MWG = path.join(SCRIPT_DIR, 'mwg.mjs');
const CASES = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, '..', 'references', 'selftest-cases.json'), 'utf8'));
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const LIMIT = limitIndex >= 0 ? Number(args[limitIndex + 1]) || 3 : 3;
const VERBOSE = args.includes('--verbose');

let failures = 0;
const startedAt = Date.now();
for (const [query, expected] of CASES) {
  let ids = [];
  try {
    const out = execFileSync(process.execPath, [MWG, 'search', query, '--json', '--limit', String(LIMIT)], { encoding: 'utf8' });
    ids = JSON.parse(out).results.map((result) => result.id);
  } catch {
    ids = [];
  }
  const hit = expected.find((id) => ids.includes(id));
  if (!hit) {
    failures += 1;
    console.log(`FAIL  ${query}  → [${ids.join(', ') || 'no match'}]  expected one of: ${expected.join(', ')}`);
  } else if (VERBOSE) {
    console.log(`ok    ${query}  → ${ids.join(', ')}`);
  }
}
const elapsed = Date.now() - startedAt;
console.log(`\nselftest: ${CASES.length - failures}/${CASES.length} passed in ${elapsed}ms (top-${LIMIT})`);
if (failures) process.exit(1);
