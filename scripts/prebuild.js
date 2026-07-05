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

// Read build config if present
const configFile = path.join(root, '.build-config.json');
const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : null;

// Section definitions: out dir, seed file, regex to identify a valid subdir name
const SECTIONS = [
  { dir: 'comparisons', seed: '.comparisons_seed', pattern: /^\d+$/ },
  { dir: 'races',       seed: '.races_seed',       pattern: /^\d+$/ },
  { dir: 'constructors', seed: '.constructors_seed', pattern: /^\d+$/ },
  { dir: 'drivers',     seed: '.drivers_seed',     pattern: /^\d+$/ },
  { dir: 'seasons',     seed: '.seasons_seed',     pattern: /^\d{4}$/ },
];

const isBacklogMode = config && config.mode === 'backlog';
if (isBacklogMode) console.log('[prebuild] backlog mode — all sections will be backed up and restored; only backlog page rebuilds.');

// legacy mode (no config): drivers + seasons are always fully rebuilt; others are passive.
// config mode: "all" = fully rebuild; array or "current-pairs" = partial; absent = passive.
// backlog mode: all sections passive — only seed page generated per section for CSS-ref extraction.
function isActive(dir) {
  if (isBacklogMode) return false;
  if (!config) return dir === 'drivers' || dir === 'seasons';
  return config[dir] === 'all';
}

for (const { dir, seed, pattern } of SECTIONS) {
  const outDir  = path.join(root, 'out', dir);
  const bakDir  = path.join(root, `_${dir}_bak`);
  const seedFile = path.join(root, seed);

  // Clean up old seed file
  if (fs.existsSync(seedFile)) fs.rmSync(seedFile);

  if (isActive(dir)) {
    // Full rebuild: no backup needed
    if (fs.existsSync(bakDir)) fs.rmSync(bakDir, { recursive: true });
    console.log(`[prebuild] ${dir}: active — will fully rebuild.`);
    continue;
  }

  // Passive or partial: back up existing pages and write a seed ID for CSS ref extraction
  if (fs.existsSync(outDir)) {
    const spec = config ? config[dir] : undefined;
    const label = isBacklogMode
      ? 'backlog — will generate 1 seed page for CSS-ref extraction and restore the rest.'
      : Array.isArray(spec)
        ? `partial — will generate ${spec.length} specific page(s) and restore the rest.`
        : spec === 'current-pairs'
          ? 'current-pairs — will generate current-driver comparison pages and restore the rest.'
          : 'cached — will generate 1 page and restore the rest.';

    console.log(`[prebuild] Backing up ${dir} pages...`);
    if (fs.existsSync(bakDir)) fs.rmSync(bakDir, { recursive: true });
    fs.cpSync(outDir, bakDir, { recursive: true });
    const entries = fs.readdirSync(bakDir).filter((d) => pattern.test(d));
    // In backlog mode pick the highest numeric ID (newest/smallest team or most recent entry)
    // to minimise seed-page generation time. In other modes pick the first (lowest) ID.
    const seed = isBacklogMode
      ? entries.sort((a, b) => parseInt(a) - parseInt(b)).pop()
      : entries.sort((a, b) => parseInt(a) - parseInt(b)).shift();
    if (seed) fs.writeFileSync(seedFile, seed);
    console.log(`[prebuild] ${dir}: ${label}`);
  } else {
    console.log(`[prebuild] ${dir}: no existing pages — will generate from scratch.`);
  }
}
