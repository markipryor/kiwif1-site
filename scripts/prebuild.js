const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// Copy flag-icons assets from node_modules to public/ so they're included in out/
const flagIconsSrc = path.join(root, 'node_modules', 'flag-icons');
if (fs.existsSync(flagIconsSrc)) {
  const destDir = path.join(root, 'public', 'flag-icons');
  if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
  fs.mkdirSync(path.join(destDir, 'css'), { recursive: true });
  fs.copyFileSync(
    path.join(flagIconsSrc, 'css', 'flag-icons.min.css'),
    path.join(destDir, 'css', 'flag-icons.min.css')
  );
  fs.cpSync(path.join(flagIconsSrc, 'flags'), path.join(destDir, 'flags'), { recursive: true });
  console.log('[prebuild] Copied flag-icons to public/.');
}

// Each entry: out dir to preserve, flag file to write, regex to identify a valid subdir ID
const CACHED = [
  { dir: 'comparisons', flag: '.comparisons_cached', pattern: /^\d+-vs-\d+$/ },
  { dir: 'races',       flag: '.races_cached',       pattern: /^\d+$/ },
  { dir: 'constructors', flag: '.constructors_cached', pattern: /^\d+$/ },
];

for (const { dir, flag, pattern } of CACHED) {
  const outDir  = path.join(root, 'out', dir);
  const bakDir  = path.join(root, `_${dir}_bak`);
  const flagFile = path.join(root, flag);

  if (fs.existsSync(outDir)) {
    console.log(`[prebuild] Backing up ${dir} pages...`);
    if (fs.existsSync(bakDir)) fs.rmSync(bakDir, { recursive: true });
    fs.cpSync(outDir, bakDir, { recursive: true });
    const entries = fs.readdirSync(bakDir);
    const first = entries.find((d) => pattern.test(d));
    fs.writeFileSync(flagFile, first || '');
    console.log(`[prebuild] ${dir}: cached — will generate 1 page and restore the rest.`);
  } else {
    console.log(`[prebuild] ${dir}: no existing pages — will generate from scratch.`);
  }
}
