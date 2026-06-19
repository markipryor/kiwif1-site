const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'out');

// Always copy vercel project config into out/
fs.mkdirSync(path.join(outDir, '.vercel'), { recursive: true });
fs.copyFileSync(path.join(root, '.vercel', 'project.json'), path.join(outDir, '.vercel', 'project.json'));

const CACHED = ['comparisons', 'races', 'constructors'];

for (const dir of CACHED) {
  const bakDir  = path.join(root, `_${dir}_bak`);
  const flagFile = path.join(root, `.${dir}_cached`);

  if (fs.existsSync(bakDir)) {
    console.log(`[postbuild] Restoring ${dir} pages from backup...`);
    fs.cpSync(bakDir, path.join(outDir, dir), { recursive: true });
    fs.rmSync(bakDir, { recursive: true });
    console.log(`[postbuild] ${dir}: restored.`);
  }

  if (fs.existsSync(flagFile)) fs.rmSync(flagFile);
}
