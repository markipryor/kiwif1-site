const fs = require('fs');
const path = require('path');

const comparisonsDir = path.join(__dirname, '..', 'out', 'comparisons');
const backupDir = path.join(__dirname, '..', '_comparisons_bak');
const flagFile = path.join(__dirname, '..', '.comparisons_cached');

if (fs.existsSync(comparisonsDir)) {
  console.log('[prebuild] Backing up comparison pages...');
  if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true });
  fs.cpSync(comparisonsDir, backupDir, { recursive: true });
  // Store one valid pair so generateStaticParams can satisfy the static export requirement
  // without querying the DB or generating all 5000+ pages
  const entries = fs.readdirSync(backupDir);
  const firstPair = entries.find((d) => /^\d+-vs-\d+$/.test(d));
  fs.writeFileSync(flagFile, firstPair || '');
  console.log(`[prebuild] Done — will generate only 1 comparison page and restore the rest from backup.`);
} else {
  console.log('[prebuild] No existing comparison pages — will generate from scratch.');
}
