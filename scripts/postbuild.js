const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'out');

// Always copy vercel project config into out/
fs.mkdirSync(path.join(outDir, '.vercel'), { recursive: true });
fs.copyFileSync(path.join(root, '.vercel', 'project.json'), path.join(outDir, '.vercel', 'project.json'));

// Extract all /_next/static/... references from an HTML file in order.
function extractStaticRefs(html) {
  return [...html.matchAll(/\/_next\/static\/[^"'\s]+/g)].map((m) => m[0]);
}

// Patch a cached HTML file by positionally replacing its /_next/static/ references
// with the corresponding ones from a freshly-built page of the same type.
// All pages of the same route share the same component → same set of static refs.
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

const CACHED = [
  { dir: 'comparisons', flag: '.comparisons_cached' },
  { dir: 'races',       flag: '.races_cached' },
  { dir: 'constructors', flag: '.constructors_cached' },
];

for (const { dir, flag } of CACHED) {
  const bakDir   = path.join(root, `_${dir}_bak`);
  const flagFile = path.join(root, flag);

  if (!fs.existsSync(bakDir)) {
    if (fs.existsSync(flagFile)) fs.rmSync(flagFile);
    continue;
  }

  // Read the freshly-built page for this section BEFORE restoring the backup.
  // All pages of this type use the same component so they share the same static refs.
  const freshId = fs.existsSync(flagFile) ? fs.readFileSync(flagFile, 'utf8').trim() : '';
  const freshPagePath = freshId ? path.join(outDir, dir, freshId, 'index.html') : '';
  const freshHtml = freshPagePath && fs.existsSync(freshPagePath)
    ? fs.readFileSync(freshPagePath, 'utf8')
    : '';
  const freshRefs = extractStaticRefs(freshHtml);

  console.log(`[postbuild] Restoring ${dir} pages from backup...`);
  fs.cpSync(bakDir, path.join(outDir, dir), { recursive: true });
  fs.rmSync(bakDir, { recursive: true });

  if (freshRefs.length > 0) {
    patchDir(dir, freshRefs);
  } else {
    console.log(`[postbuild] ${dir}: warning — no fresh refs found, cached pages not patched.`);
  }

  if (fs.existsSync(flagFile)) fs.rmSync(flagFile);
  console.log(`[postbuild] ${dir}: restored.`);
}
