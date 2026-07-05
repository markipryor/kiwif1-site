/**
 * Post-deploy smoke test — run with: node scripts/smoke-test.js [base-url]
 * Hits live pages and checks status codes + key content.
 * Defaults to https://out-beta-five.vercel.app if no URL is passed.
 */
const BASE = process.argv[2] || 'https://out-beta-five.vercel.app';
let passed = 0;
let failed = 0;

function ok(label)    { console.log(`  ✓ ${label}`); passed++; }
function fail(label)  { console.error(`  ✗ ${label}`); failed++; }

async function check(path, { contains = [], notContains = [] } = {}) {
  const url = `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch (e) {
    fail(`${path} — fetch error: ${e.message}`);
    return;
  }
  if (res.status !== 200) {
    fail(`${path} — HTTP ${res.status}`);
    return;
  }
  if (contains.length === 0 && notContains.length === 0) {
    ok(`${path} — 200`);
    return;
  }

  const html = await res.text();
  let pageOk = true;
  for (const text of notContains) {
    if (html.includes(text)) {
      fail(`${path} — contains "${text}"`);
      pageOk = false;
    }
  }
  for (const text of contains) {
    if (!html.includes(text)) {
      fail(`${path} — missing "${text}"`);
      pageOk = false;
    }
  }
  if (pageOk) ok(`${path} — 200, content ok`);
}

const ERROR_PATTERNS = ['Invalid Date', '>NaN<', '>undefined<'];

const PAGES = [
  // Core pages
  { path: '/',              contains: ['KiwiF1', 'Formula'] },
  { path: '/backlog/',      contains: ['deployed'] },
  { path: '/records/',      contains: ['record'] },
  { path: '/drivers/',      contains: ['Driver'] },
  { path: '/constructors/', contains: ['Constructor'] },
  { path: '/seasons/',      contains: ['Season'] },

  // Known data: Juan Manuel Fangio (#1) — oldest driver, large historical dataset
  { path: '/drivers/1/',    contains: ['Fangio'], notContains: ERROR_PATTERNS },

  // Known edge case: Jack Aitken (#397) — single race, epoch dateOfDeath in DB
  { path: '/drivers/397/',  notContains: ERROR_PATTERNS },

  // Known data: Scuderia Ferrari (#54)
  { path: '/constructors/54/', contains: ['Ferrari'], notContains: ERROR_PATTERNS },

  // Current season
  { path: '/seasons/2025/', notContains: ERROR_PATTERNS },

  // Records subcategories
  { path: '/records/wins/',          notContains: ERROR_PATTERNS },
  { path: '/records/race-starts/',   notContains: ERROR_PATTERNS },
  { path: '/records/cons-wins/',     notContains: ERROR_PATTERNS },
];

(async () => {
  console.log(`\nSmoke testing: ${BASE}\n`);
  for (const { path, contains = [], notContains = [] } of PAGES) {
    await check(path, { contains, notContains });
  }
  console.log(`\n${'─'.repeat(50)}`);
  if (failed > 0) {
    console.error(`FAILED: ${failed} checks. Passed: ${passed}.`);
    process.exit(1);
  } else {
    console.log(`All ${passed} checks passed.`);
  }
})();
