#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const root = path.join(__dirname, '..');
const CONFIG_FILE = path.join(root, '.build-config.json');

const MODES = ['full', 'race', 'drivers', 'comparisons', 'constructors', 'seasons', 'records', 'backlog', 'rankings', 'homepage'];

async function getDb() {
  return mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'kiwif1',
    dateStrings: true,
  });
}

async function getRaceUpdateConfig(db) {
  const [races] = await db.execute(`
    SELECT id, YEAR(date) AS year FROM grandsprix
    WHERE date <= CURDATE()
    ORDER BY date DESC LIMIT 1
  `);
  if (!races.length) throw new Error('No completed races found');
  const { id: raceId, year } = races[0];

  const [drivers] = await db.execute(
    `SELECT DISTINCT driver_id FROM results WHERE grandprix_id = ?`, [raceId]
  );
  const [constructors] = await db.execute(
    `SELECT DISTINCT e.constructor_id FROM results r
     JOIN entrants e ON e.id = r.entrant_id
     WHERE r.grandprix_id = ?`, [raceId]
  );

  console.log(`[setup-build] Race ${raceId} (${year}): ${drivers.length} drivers, ${constructors.length} constructors`);

  return {
    mode: 'race',
    races: [raceId],
    drivers: drivers.map((r) => r.driver_id),
    constructors: constructors.map((r) => r.constructor_id),
    seasons: [year],
    comparisons: 'current-pairs',
  };
}

async function main() {
  const mode = process.argv[2];
  if (!mode || !MODES.includes(mode)) {
    console.error(`Usage: node scripts/setup-build.js <mode>`);
    console.error(`Modes: ${MODES.join(', ')}`);
    process.exit(1);
  }

  if (mode === 'full') {
    if (fs.existsSync(CONFIG_FILE)) fs.rmSync(CONFIG_FILE);
    console.log('[setup-build] Full mode: cleared .build-config.json — all sections will be rebuilt.');
    return;
  }

  let config;
  let db;
  try {
    if (mode === 'race') {
      db = await getDb();
      config = await getRaceUpdateConfig(db);
    } else if (mode === 'rankings') {
      config = { mode: 'rankings', drivers: 'all' };
    } else if (mode === 'drivers') {
      config = { mode: 'drivers', drivers: 'all' };
    } else if (mode === 'comparisons') {
      config = { mode: 'comparisons', comparisons: 'all' };
    } else if (mode === 'constructors') {
      config = { mode: 'constructors', constructors: 'all' };
    } else if (mode === 'seasons') {
      config = { mode: 'seasons', seasons: 'all' };
    } else {
      // records, backlog, homepage: all dynamic sections passive
      config = { mode };
    }
  } finally {
    if (db) await db.end();
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(`[setup-build] Wrote .build-config.json for mode: ${mode}`);
}

main().catch((err) => {
  console.error('[setup-build] Error:', err.message);
  process.exit(1);
});
