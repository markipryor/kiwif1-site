const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'out');
const backupDir = path.join(root, '_comparisons_bak');
const flagFile = path.join(root, '.comparisons_cached');

// Always copy vercel project config into out/
fs.mkdirSync(path.join(outDir, '.vercel'), { recursive: true });
fs.copyFileSync(path.join(root, '.vercel', 'project.json'), path.join(outDir, '.vercel', 'project.json'));

// Restore comparison pages from backup
if (fs.existsSync(backupDir)) {
  console.log('[postbuild] Restoring comparison pages from backup...');
  fs.cpSync(backupDir, path.join(outDir, 'comparisons'), { recursive: true });
  fs.rmSync(backupDir, { recursive: true });
  console.log('[postbuild] Done.');
}

if (fs.existsSync(flagFile)) fs.rmSync(flagFile);
