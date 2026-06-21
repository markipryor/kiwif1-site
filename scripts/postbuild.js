const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'out');

// Always copy vercel project config into out/
fs.mkdirSync(path.join(outDir, '.vercel'), { recursive: true });
fs.copyFileSync(path.join(root, '.vercel', 'project.json'), path.join(outDir, '.vercel', 'project.json'));

// Build a map of unhashed-name → new hashed path from the freshly built index.html
function buildRefMap(indexHtml) {
  const map = {};
  const re = /\/_next\/static\/(css|chunks)\/([^"'\s]+)/g;
  let m;
  while ((m = re.exec(indexHtml)) !== null) {
    const [, type, file] = m;
    const bare = file.replace(/-[a-f0-9]{8,}(\.[^.]+)$/, '$1');
    map[`${type}/${bare}`] = `/_next/static/${type}/${file}`;
  }
  return map;
}

// Patch all index.html files under a dir, replacing stale _next/static refs with new hashes
function patchStaticRefs(dir, refMap) {
  const targetDir = path.join(outDir, dir);
  if (!fs.existsSync(targetDir)) return;
  function walk(d) {
    for (const entry of fs.readdirSync(d)) {
      const full = path.join(d, entry);
      if (fs.statSync(full).isDirectory()) { walk(full); continue; }
      if (entry !== 'index.html') continue;
      let html = fs.readFileSync(full, 'utf8');
      let changed = false;
      html = html.replace(/\/_next\/static\/(css|chunks)\/([^"'\s]+)/g, (match, type, file) => {
        const bare = file.replace(/-[a-f0-9]{8,}(\.[^.]+)$/, '$1');
        const newRef = refMap[`${type}/${bare}`];
        if (newRef && newRef !== match) { changed = true; return newRef; }
        return match;
      });
      if (changed) fs.writeFileSync(full, html);
    }
  }
  walk(targetDir);
}

const indexHtml = fs.existsSync(path.join(outDir, 'index.html'))
  ? fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')
  : '';
const refMap = buildRefMap(indexHtml);

const CACHED = ['comparisons', 'races', 'constructors'];

for (const dir of CACHED) {
  const bakDir  = path.join(root, `_${dir}_bak`);
  const flagFile = path.join(root, `.${dir}_cached`);

  if (fs.existsSync(bakDir)) {
    console.log(`[postbuild] Restoring ${dir} pages from backup...`);
    fs.cpSync(bakDir, path.join(outDir, dir), { recursive: true });
    fs.rmSync(bakDir, { recursive: true });
    if (Object.keys(refMap).length > 0) {
      patchStaticRefs(dir, refMap);
    }
    console.log(`[postbuild] ${dir}: restored.`);
  }

  if (fs.existsSync(flagFile)) fs.rmSync(flagFile);
}
