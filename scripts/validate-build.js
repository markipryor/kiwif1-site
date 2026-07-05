/**
 * Post-build validation — run with: node scripts/validate-build.js
 * Checks the out/ directory for common rendering errors before deploying.
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');
let errors = 0;
let warnings = 0;
let checked = 0;

function fail(msg) { console.error(`  ✗ ${msg}`); errors++; }
function warn(msg)  { console.warn(`  ! ${msg}`); warnings++; }
function ok(msg)    { console.log(`  ✓ ${msg}`); }

// ─── 1. Required pages exist ────────────────────────────────────────────────
console.log('\n[1] Checking required pages exist...');
const required = [
  'index.html',
  'backlog/index.html',
  'records/index.html',
  'drivers/index.html',
  'constructors/index.html',
  'seasons/index.html',
];
for (const rel of required) {
  const p = path.join(outDir, rel);
  if (!fs.existsSync(p)) fail(`Missing: ${rel}`);
  else ok(rel);
}

// ─── 2. Scan section pages for common rendering errors ─────────────────────
console.log('\n[2] Scanning section pages for rendering errors...');

const VISIBLE_ERROR_PATTERNS = [
  { re: /Invalid Date/,                          label: 'Invalid Date' },
  { re: />NaN</,                                 label: 'NaN rendered' },
  { re: />undefined</,                           label: '"undefined" rendered' },
  { re: /Application error: a client-side/,      label: 'Next.js client error boundary' },
  { re: /ChunkLoadError/,                        label: 'ChunkLoadError' },
];

const SECTIONS = ['drivers', 'constructors', 'seasons', 'races', 'comparisons', 'records'];
const MIN_PAGE_KB = 3;    // pages below this are likely blank/broken
const MAX_PAGE_KB = 2000; // pages above this are suspiciously large

function checkHtml(file, rel) {
  checked++;
  const stat = fs.statSync(file);
  const kb = stat.size / 1024;

  if (kb < MIN_PAGE_KB) {
    fail(`${rel} is only ${kb.toFixed(1)} KB — likely blank or broken`);
    return;
  }
  if (kb > MAX_PAGE_KB) {
    warn(`${rel} is ${kb.toFixed(0)} KB — unusually large`);
  }

  const html = fs.readFileSync(file, 'utf8');
  for (const { re, label } of VISIBLE_ERROR_PATTERNS) {
    if (re.test(html)) fail(`${rel}: contains "${label}"`);
  }
}

for (const section of SECTIONS) {
  const dir = path.join(outDir, section);
  if (!fs.existsSync(dir)) { warn(`Section missing: ${section}`); continue; }

  // Check the index page
  const indexPage = path.join(dir, 'index.html');
  if (fs.existsSync(indexPage)) checkHtml(indexPage, `${section}/index.html`);

  // Sample up to 10 sub-pages per section
  const entries = fs.readdirSync(dir).filter(e => {
    const sub = path.join(dir, e);
    return fs.statSync(sub).isDirectory() && fs.existsSync(path.join(sub, 'index.html'));
  });

  const sample = entries.length <= 10 ? entries : [
    entries[0],
    entries[Math.floor(entries.length * 0.25)],
    entries[Math.floor(entries.length * 0.5)],
    entries[Math.floor(entries.length * 0.75)],
    entries[entries.length - 1],
  ];

  for (const entry of sample) {
    checkHtml(path.join(dir, entry, 'index.html'), `${section}/${entry}`);
  }
}

// ─── 3. Check key content markers ──────────────────────────────────────────
console.log('\n[3] Checking key content markers...');

function assertContains(file, pattern, description) {
  if (!fs.existsSync(file)) { fail(`${file} missing`); return; }
  const html = fs.readFileSync(file, 'utf8');
  if (!pattern.test(html)) fail(`${path.relative(outDir, file)}: missing "${description}"`);
  else ok(`${path.relative(outDir, file)}: has "${description}"`);
}

assertContains(
  path.join(outDir, 'index.html'),
  /KiwiF1|Formula 1/i,
  'KiwiF1 branding'
);
assertContains(
  path.join(outDir, 'backlog', 'index.html'),
  /backlog|task/i,
  'backlog content'
);
assertContains(
  path.join(outDir, 'records', 'index.html'),
  /record|most wins|most poles/i,
  'records content'
);

// ─── 4. Summary ────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Checked ${checked} pages.`);
if (errors > 0) {
  console.error(`FAILED: ${errors} error(s), ${warnings} warning(s).`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`PASSED with ${warnings} warning(s).`);
} else {
  console.log('All checks passed.');
}
