const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'out');

// Always copy vercel project config into out/
fs.mkdirSync(path.join(outDir, '.vercel'), { recursive: true });
fs.copyFileSync(path.join(root, '.vercel', 'project.json'), path.join(outDir, '.vercel', 'project.json'));

// Read build config if present
const configFile = path.join(root, '.build-config.json');
const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : null;

// Extract all /_next/static/... references from an HTML file in order.
function extractStaticRefs(html) {
  return [...html.matchAll(/\/_next\/static\/[^"'\s]+/g)].map((m) => m[0]);
}

// Patch a cached HTML file by positionally replacing its /_next/static/ references
// with the corresponding ones from a freshly-built page of the same type.
function patchHtml(cachedHtml, freshRefs) {
  let i = 0;
  let changed = false;
  const result = cachedHtml.replace(/\/_next\/static\/[^"'\s]+/g, (match) => {
    const fresh = freshRefs[i++];
    if (fresh && fresh !== match) { changed = true; return fresh; }
    return match;
  });
  return { html: result, changed };
}

function patchDir(dir, freshRefs) {
  const targetDir = path.join(outDir, dir);
  if (!fs.existsSync(targetDir)) return;
  function walk(d) {
    for (const entry of fs.readdirSync(d)) {
      const full = path.join(d, entry);
      if (fs.statSync(full).isDirectory()) { walk(full); continue; }
      if (entry !== 'index.html') continue;
      const cached = fs.readFileSync(full, 'utf8');
      const { html, changed } = patchHtml(cached, freshRefs);
      if (changed) fs.writeFileSync(full, html);
    }
  }
  walk(targetDir);
}

const SECTIONS = [
  { dir: 'comparisons', seed: '.comparisons_seed' },
  { dir: 'races',       seed: '.races_seed' },
  { dir: 'constructors', seed: '.constructors_seed' },
  { dir: 'drivers',     seed: '.drivers_seed' },
  { dir: 'seasons',     seed: '.seasons_seed' },
];

// legacy mode (no config): drivers + seasons active, no backup; others passive.
// config mode: "all" = active; array or "current-pairs" = partial; absent = passive.
function getSectionKind(dir) {
  if (!config) return (dir === 'drivers' || dir === 'seasons') ? 'active' : 'passive';
  const spec = config[dir];
  if (spec === 'all') return 'active';
  if (spec === undefined) return 'passive';
  return 'partial'; // array or "current-pairs"
}

for (const { dir, seed } of SECTIONS) {
  const bakDir     = path.join(root, `_${dir}_bak`);
  const seedFile   = path.join(root, seed);
  const sectionOut = path.join(outDir, dir);
  const tempDir    = path.join(root, `_${dir}_fresh`);
  const kind       = getSectionKind(dir);

  if (!fs.existsSync(bakDir)) {
    // No backup = section was active (full rebuild) or never existed
    if (fs.existsSync(seedFile)) fs.rmSync(seedFile);
    continue;
  }

  // For partial builds: save freshly-generated pages before restoring backup
  if (kind === 'partial' && fs.existsSync(sectionOut)) {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
    fs.cpSync(sectionOut, tempDir, { recursive: true });
  }

  // Get CSS refs from a fresh page (use seed page, or any page from temp for partial builds)
  const seedId = fs.existsSync(seedFile) ? fs.readFileSync(seedFile, 'utf8').trim() : '';
  let freshHtml = '';
  if (seedId) {
    const p = path.join(outDir, dir, seedId, 'index.html');
    if (fs.existsSync(p)) freshHtml = fs.readFileSync(p, 'utf8');
  }
  if (!freshHtml && kind === 'partial' && fs.existsSync(tempDir)) {
    for (const entry of fs.readdirSync(tempDir)) {
      const p = path.join(tempDir, entry, 'index.html');
      if (fs.existsSync(p)) { freshHtml = fs.readFileSync(p, 'utf8'); break; }
    }
  }
  const freshRefs = extractStaticRefs(freshHtml);

  console.log(`[postbuild] Restoring ${dir} pages from backup...`);
  fs.cpSync(bakDir, sectionOut, { recursive: true });
  fs.rmSync(bakDir, { recursive: true });

  if (freshRefs.length > 0) {
    patchDir(dir, freshRefs);
  } else {
    console.log(`[postbuild] ${dir}: warning — no fresh refs found, cached pages not patched.`);
  }

  // For partial builds: copy fresh pages back over restored backup (new/updated pages win)
  if (kind === 'partial' && fs.existsSync(tempDir)) {
    const freshCount = fs.readdirSync(tempDir).length;
    fs.cpSync(tempDir, sectionOut, { recursive: true });
    fs.rmSync(tempDir, { recursive: true });
    console.log(`[postbuild] ${dir}: restored + merged ${freshCount} fresh pages.`);
  } else {
    console.log(`[postbuild] ${dir}: restored.`);
  }

  if (fs.existsSync(seedFile)) fs.rmSync(seedFile);
}
