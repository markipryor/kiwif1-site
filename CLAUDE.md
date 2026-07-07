@AGENTS.md

# KiwiF1 Site — Project Rules

## Build modes

Use `npm run build:<mode>` — this runs `setup-build.js` to set `.build-config.json` automatically, then builds. Never manually edit `.build-config.json` for standard builds.

| Mode | Command | What rebuilds |
|------|---------|---------------|
| `race` | `npm run build:race` | Auto-detects latest completed race from DB; rebuilds that race, its drivers, constructors, and season |
| `full` | `npm run build:full` | Everything — all drivers, constructors, seasons, races, comparisons |
| `drivers` | `npm run build:drivers` | All driver pages |
| `constructors` | `npm run build:constructors` | All constructor pages |
| `seasons` | `npm run build:seasons` | All season pages |
| `comparisons` | `npm run build:comparisons` | All comparison pages |
| `rankings` | `npm run build:rankings` | All driver pages (rankings view) |
| `records` | `npm run build:records` | Records page only (passive for all sections) |
| `backlog` | `npm run build:backlog` | Backlog page only — fast (~28 pages). Use for any change to `tasks.ts` only |
| `homepage` | `npm run build:homepage` | Home page only |

## Deploy

```
npm run deploy
```

After deploying, check the upload size in the Vercel output. A full-site deploy uploads ~34 MB / ~28,700 files. If the output shows only a few MB (e.g. 4 MB / 3,000 files), the archive was incomplete — the `out/` directory was captured before the postbuild restore finished. Re-run `npm run deploy` immediately to fix it.

Shorthand for the full race workflow (build + deploy):
```
npm run race
```

## Race deploy checklist

After entering race data and before running `npm run race`, update the circuit layout records if the new race set a faster pole or lap time:

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root kiwif1 -e "
UPDATE circuitlayouts cl
SET cl.bestPoleTime = (
  SELECT pt.time FROM poletimes pt
  JOIN grandsprix gp ON gp.id = pt.grandprix_id
  WHERE gp.circuitlayout_id = cl.id AND pt.time != ''
  ORDER BY TIME_TO_SEC(CONCAT('00:', pt.time)) ASC LIMIT 1
)
WHERE cl.id = (
  SELECT gp.circuitlayout_id FROM grandsprix gp
  WHERE gp.date <= CURDATE() AND gp.circuitlayout_id != 0
  ORDER BY gp.date DESC LIMIT 1
);

UPDATE circuitlayouts cl
SET cl.bestRaceLapTime = (
  SELECT fl.time FROM fastestlaps fl
  JOIN grandsprix gp ON gp.id = fl.grandprix_id
  WHERE gp.circuitlayout_id = cl.id AND fl.time != ''
  ORDER BY TIME_TO_SEC(CONCAT('00:', fl.time)) ASC LIMIT 1
)
WHERE cl.id = (
  SELECT gp.circuitlayout_id FROM grandsprix gp
  WHERE gp.date <= CURDATE() AND gp.circuitlayout_id != 0
  ORDER BY gp.date DESC LIMIT 1
);
"
```

This recalculates both records for the circuit layout of the most recent race. It is idempotent — safe to run every time regardless of whether a new record was set.

## Committing after builds

After every build **except** backlog-only builds (`npm run build:backlog`), commit all changes to GitHub before or immediately after deploying. Use a concise commit message describing what was rebuilt, e.g. `build: race 2025 Abu Dhabi GP` or `build: driver 397 partial rebuild`.

Backlog-only builds touch only `tasks.ts` and the backlog HTML — these are typically committed as part of the task change itself, not as a separate build commit.

## Build failures

If `npm run build` (or any `build:<mode>`) fails, automatically retry without asking until it succeeds.

## Disk space

**Before every build**, check free space on C: and abort with a warning if less than 5 GB free:
```powershell
$free = (Get-PSDrive C).Free / 1GB
if ($free -lt 5) { Write-Warning "Only $([math]::Round($free,1)) GB free — build aborted. Free space first." }
```

**After any build that fails due to query timeouts**, MariaDB leaves behind large orphaned temp files in `C:\xampp\tmp\`. Clean them up before retrying:
1. Stop MySQL in the XAMPP Control Panel (it runs as a process, not a Windows service — `net stop mysql` won't work)
2. Delete the temp files: `Remove-Item "C:\xampp\tmp\#sql*" -Force`
3. Restart MySQL in the XAMPP Control Panel

Each timed-out query can leave 4–12 GB of `#sql*.MAD/.MAI` files. Multiple failed builds can accumulate 50–70 GB.

**After killing a build with `Stop-Process -Name node`**, MySQL connections from that build stay alive and hold table locks — they do NOT die with the node process. Any subsequent DDL (`ALTER TABLE`, `CREATE INDEX`) or new build will hang waiting for those locks. Always check and kill stuck connections first:
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "SELECT Id, Time, LEFT(Info, 80) FROM information_schema.PROCESSLIST WHERE COMMAND != 'Sleep' AND USER != 'system user' AND Id != CONNECTION_ID();"
# Then kill each Id shown:
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "KILL <id>;"
```

## Build parallelism

`next.config.ts` sets `experimental: { cpus: 2 }`. This is intentional — full section rebuilds (constructors, drivers) run heavy aggregate queries and 7 parallel workers create enough DB contention to push every page past the timeout. Keep it at 2. Do not remove or increase this setting.

## Constructor chain query

`getConstructorChain` in `queries.ts` uses a WITH RECURSIVE CTE with `FIND_IN_SET` cycle guards in both the `ancestors` and `chain` CTEs. This is necessary because some constructors "returned" under the same name after becoming a different team (e.g. Sauber → BMW Sauber → Sauber, March → Leyton House → March), creating closed loops in the `formedFrom`/`became` fields. The cycle guards cause the chain to terminate gracefully when a constructor would be revisited. Do not remove them — without them, affected constructor pages hang at the 1000-iteration recursion limit.

## Versioning

- Version string is in `src/app/layout.tsx` (footer) and in the `deployed[]` array in `src/app/backlog/tasks.ts`.
- **Always increment the patch number only** (last digit). e.g. `v6.4.0 → v6.4.1`. Never bump the minor or major number.
- Update the footer version only in pages that are already being rebuilt as part of the current task. Never trigger a separate rebuild just to update the version number.
- Do not rename a version that has already been deployed.

## Architecture

- **Next.js static site**: `C:\Users\markp\kiwif1-site` (this repo) — SSG, deployed to Vercel
- **Laravel/PHP backend**: `C:\xampp\htdocs\kiwif1` — admin app, never deployed publicly
- **Database**: MariaDB via XAMPP at `127.0.0.1:3306`, database name `kiwif1`
- The PHP app manages data entry; the Next.js site queries the DB at build time to generate static HTML

## Key query gotchas

**circuitlayout_id=0** — Many races (especially 2022–2024) have `grandsprix.circuitlayout_id = 0`. Always use LEFT JOIN:
```sql
LEFT JOIN circuitlayouts cl ON cl.id = gp.circuitlayout_id AND gp.circuitlayout_id != 0
LEFT JOIN circuits ci ON cl.circuit_id = ci.id
LEFT JOIN nationalities n ON ci.nationality_id = n.id
```
An INNER JOIN returns 0 rows for those seasons, causing `notFound()` and blank pages.

**Poles detection** — The `poletimes` table has no `driver_id` column. Detect a driver's pole via:
```sql
LEFT JOIN poletimes pt ON pt.grandprix_id = gp.id
-- pole = r.grid = '1' AND pt.id IS NOT NULL
```

**Points** — `results.actualPointsDriver` and `results.actualPointsConstructor` are always 0. Points are computed dynamically using SQL CASE helpers in `queries.ts`:
- `totalPts()` — full points including sprint and FL bonus; use in all points-aggregating queries
- `racePts()` — race points only, no sprint/FL; use for season winner column on seasons list
- `flBonus()` — requires `LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id`
- Sprint points — require `LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id`

**Empty `generateStaticParams` arrays** — When `build:race` is run before race results are entered, `setup-build.js` returns 0 drivers and 0 constructors, producing `drivers: [], constructors: []` in `.build-config.json`. `generateStaticParams()` returning `[]` causes: `Error: Page "/constructors/[id]" is missing "generateStaticParams()"`. Fix already applied: all section pages guard with `Array.isArray(spec) && spec.length > 0` before mapping, so an empty array falls through to the seed file instead.

**Performance** — `totalPts()` with sprint/FL joins is ~100× slower than `racePts()`. Complex joins on the seasons list page caused 60s build timeouts. Use `racePts()` for the seasons list winner column; `totalPts()` elsewhere.

## Milestone thresholds

Milestones display on race pages (`/races/[id]/`) between race results and sprint results. Code: `getRaceMilestones()` in `queries.ts`.

- **starts, wins, podiums, poles, fastest laps**: trigger at counts `1, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450`
- **points**: trigger when cumulative career points first cross `100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000` — or on first career points ever (n=0)

## Testing

### When to run each test

| Test | Command | When |
|------|---------|------|
| Build validation | `npm run validate` | After every build, before deploying |
| Smoke test | `npm run smoke:prod` | After every deploy |
| Disk space check | see below | Before every build (auto-run per the rule above) |

### Build validation (`npm run validate`)

Runs `scripts/validate-build.js` against the `out/` directory. Checks:
- All required pages exist (`index.html`, `backlog/`, `records/`, etc.)
- No page is below 3 KB (blank/broken) or above 2 MB (suspiciously large)
- No page contains `Invalid Date`, `NaN`, or `undefined` in rendered content
- Key content markers are present (e.g. branding on home page)

Samples 5 representative pages per section (first, 25th percentile, median, 75th, last). Exits non-zero on any failure — treat this as a gate before deploying.

### Post-deploy smoke test (`npm run smoke:prod`)

Runs `scripts/smoke-test.js` against the live Vercel URL. Checks:
- HTTP 200 on core pages (home, backlog, records, drivers list, constructors list, seasons list)
- Driver #1 (Fangio — large historical dataset), #397 (Aitken — edge case: single race, epoch dateOfDeath)
- Constructor #54 (Ferrari), season 2025, records subcategories
- None of the above pages contain `Invalid Date`, `NaN`, or `undefined`

Pass a different URL as the first argument if testing a preview deploy: `node scripts/smoke-test.js https://preview-url.vercel.app`

### Stale RSC payload risk

Driver/constructor/race pages that were backed up during a build and never rebuilt since can have **stale RSC payloads** — the HTML bakes in props from the old build, but the JS bundle expects the current component interface. Symptom: page renders correctly as static HTML but throws `Cannot read properties of undefined (reading 'map')` or similar in the browser console.

**Fix**: rebuild the affected pages. Write `.build-config.json` manually and run `npm run build`:
```json
{ "mode": "partial", "drivers": [397] }
```
This backs up all sections, regenerates only the listed pages, then restores the rest. Clean up `.build-config.json` afterward (or the next `npm run build:<mode>` will overwrite it).

**Prevention**: when adding a new prop to a client component (`"use client"`), guard it with `?? []` or `?? null` so stale backups degrade gracefully rather than crashing.

### Known edge cases to spot-check

- **Driver 397 (Jack Aitken)**: single race (2020 Sakhir GP), `dateOfDeath = 1970-01-01` in DB (epoch, handled as NULL by CASE in `getDriverById`). Previously had a stale RSC payload missing `seasonCumulative` — fixed 2026-07-05.
- **Races with circuitlayout_id = 0**: INNER JOINs on circuitlayouts cause `notFound()`. Always use LEFT JOIN (see Key query gotchas above).

## Backlog task lifecycle

- New tasks start as `"pending"`.
- After a build+deploy that includes the feature, mark as `"deployed"` (add `version` field).
- Only mark `"done"` when the user explicitly confirms.
- After deploying race data updates, always ask the user if they want to close the corresponding backlog task.
