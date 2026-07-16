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

## Dev server for UI-only changes

For styling, layout, spacing, and component changes where no queries or data logic are changing, use the dev server instead of building:

```powershell
npm run dev
```

Requires XAMPP MySQL to be running. Server starts at `http://localhost:3000`.

**How `next dev` differs from a build:**
- `output: "export"` is ignored — pages render on demand from the DB, no static generation
- `generateStaticParams` is not called — navigate directly to any URL (e.g. `localhost:3000/races/598/`)
- Prebuild and postbuild scripts do not run — no backup/restore needed
- Hot module replacement: component edits appear in the browser immediately (or on refresh)
- `.build-config.json` is irrelevant — all pages are available on demand

**Workflow:**
1. Start dev server with `npm run dev`
2. Make the CSS/component change
3. Tell the user which URL(s) to check in the browser
4. Iterate based on visual feedback
5. Only run a build once the UI is confirmed correct

**When NOT to use dev:**
- Any change to `queries.ts` (query results look correct in dev but static pages may differ due to missing LEFT JOINs, backup/restore timing, etc.)
- New pages or new `generateStaticParams` paths
- Changes to `tasks.ts` (use `build:backlog` instead)
- Any change that affects data rather than presentation

## Build/deploy: proceed without confirmation

When the user says to build and/or deploy, execute every step of the workflow autonomously — no mid-process questions, no "should I proceed?", no confirmation requests. The entire sequence below is pre-approved:

1. Disk space check
2. Circuit layout record update (`mysql.exe UPDATE`)
3. Version bump in `layout.tsx`
4. Task status update in `tasks.ts`
5. `npm run build:<mode>` (any mode, retried automatically on failure)
6. `npm run build:rankings` and/or `npm run build:records` if included
7. `npm run validate`
8. `npm run deploy`
9. `npm run smoke:prod`
10. `git add` + `git commit` for the build artifacts

If something fails, investigate and fix it, but never stop to ask permission for any of the above steps.

## Deploy

```
npm run deploy
```

Shorthand for the full race workflow (build + deploy):
```
npm run race
```

**After every deploy, verify the upload size** in the Vercel CLI output matches the expected range for the build mode:

| Build mode | Expected upload | Expected files |
|------------|----------------|----------------|
| `race`, `full`, `drivers`, `constructors`, `seasons`, `records` | ~34 MB | ~28,700 |
| `backlog` | ~4–5 MB | ~3,000–3,500 |

If a non-backlog deploy shows only a few MB, the archive was incomplete — the `out/` directory was captured before the postbuild restore finished. Re-run `npm run deploy` immediately. This has been observed to cause entire sections (e.g. all constructor pages) to 404 in production.

## After every build and deploy

After the smoke test passes, review what was built and deployed. If anything surprised you — a query pattern that caused a bug, a DB schema detail that wasn't obvious, a build/deploy sequence that turned out to matter — write it to CLAUDE.md under the relevant section before ending the session.

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

`getConstructorChain` in `queries.ts` uses a **JavaScript traversal** (not SQL WITH RECURSIVE — the CTE approach was replaced because FIND_IN_SET cycle detection prevented returning constructors from appearing more than once).

**`formedFrom` / `became` field format** — both are `varchar(11)` and can contain:
- A single ID: `"156"` — one predecessor/successor
- `"0"` — no predecessor/successor (root or terminal)
- `NULL` — treated as `"0"` (Apollon id=173, Cadillac id=177 have NULL; always handle)
- Comma-separated IDs: `"0,87"` / `"87,0"` — the constructor had **multiple stints**. Index `i` in `formedFrom` pairs with index `i` in `became` to define one stint. Example: March has `formedFrom="0,87"` and `became="87,0"`, meaning stint 0 has no predecessor and leads to Leyton House (87); stint 1 comes from Leyton House and has no successor. This produces the chain March → Leyton House → March.

**Traversal**: walk backwards from the requested constructor to find the chain root, then walk forwards. Use `(constructorId:instanceIndex)` as visited-set keys so the same constructor can appear at multiple positions. Year ranges come from race results per constructor_id; the display caps each entry's end at `nextEntry.rawFirstYear − 1` when the next entry has a later firstYear, so returning constructors don't bleed their full historical range into the display.

**MySQL tinyint in JSX** — `current`, `indyOnly` and similar DB fields come back as JavaScript numbers `0`/`1`, not booleans. In JSX, `{0 && <Component>}` renders the literal character `"0"` in the DOM (React renders falsy numbers, unlike `false`/`null`/`undefined`). Always coerce: `{!!row.current && <Component>}`. This has caused bugs on both driver pages (KF1-D-BUG-01) and constructor Team History.

## Versioning

- Version string is in `src/app/layout.tsx` (footer) and in the `deployed[]` array in `src/app/backlog/tasks.ts`.
- **Always increment the patch number only** (last digit). e.g. `v6.4.1 → v6.4.2`. Never bump the minor or major number.
- **Every deploy except a backlog-only deploy must increment the version.** Backlog-only builds (`npm run build:backlog`) do not require a version bump. All other builds (race, full, drivers, constructors, seasons, etc.) must bump the version before deploying.
- Update the footer version only in pages that are already being rebuilt as part of the current task. Never trigger a separate rebuild just to update the version number.
- Do not rename a version that has already been deployed.

## Architecture

- **Next.js static site**: `C:\Users\markp\kiwif1-site` (this repo) — SSG, deployed to Vercel
- **Laravel/PHP backend**: `C:\xampp\htdocs\kiwif1` — admin app, never deployed publicly
- **Database**: MariaDB via XAMPP at `127.0.0.1:3306`, database name `kiwif1`
- The PHP app manages data entry; the Next.js site queries the DB at build time to generate static HTML

## Key query gotchas

**`completed_years` CTE pattern** — `getConstructorSeasonChampInfo` and `getConstructorDriverWdcPositions` both used a `completed_years` CTE (`HAVING MAX(gp.date) < CURDATE()`) to exclude in-progress seasons from championship position data. This is non-obvious from the function signatures. To show live standings for the current in-progress season, remove the `completed_years` CTE and its JOIN references — `constructor_years` already includes the current year via actual results. Applied in v6.4.9.

**MariaDB aggregate expressions in ORDER BY** — MariaDB allows `SUM(CASE WHEN r.place = '2' THEN 1 ELSE 0 END) DESC` directly in ORDER BY without requiring the expression to appear in SELECT. However, this still requires hardcoding each position (1–10 etc.) and can't handle arbitrary depths. For full F1 tiebreaking across all positions, use a second parallel query to fetch `{driverId, place, cnt}` with `r.place REGEXP '^[0-9]+$' AND CAST(r.place AS UNSIGNED) > 0`, build a `Map<driverId, Map<pos, count>>`, then sort in JavaScript iterating `pos = 1..maxPos`.

**`totalPts()` in HAVING requires LEFT JOINs** — `totalPts()` generates a SQL expression referencing `fl` and `s` aliases (fastestlaps and sprints). If used in a HAVING clause (e.g. `HAVING SUM(${totalPts()}) = 0`), the `LEFT JOIN fastestlaps fl` and `LEFT JOIN sprints s` must be present in the FROM clause or the query will fail with "unknown column". Easy to miss when writing new queries that don't otherwise need those joins.

**Grid position filtering** — The `grid` column can contain non-numeric values. When filtering by numeric grid position, always use `r.grid REGEXP '^[0-9]+$' AND CAST(r.grid AS UNSIGNED) > N` rather than bare `r.grid != '1'` or `r.grid > 1`.

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

**Constructor names** — Many constructors (especially pre-1980, e.g. Brabham/Surtees in 1972) have `name=''` with only `shortName` set. Every query joining to the `constructors` table must use `COALESCE(NULLIF(c.name,''), c.shortName)` — never bare `c.name`. Bare `c.name` produces blank constructor names in standings, race results, and any other output. This has bitten us in multiple queries.

**`??` vs `||` for DB string fields** — `??` only replaces `null`/`undefined`, not empty string `""`. Many older DB rows store `""` rather than NULL (e.g. `grandsprix.fullTitle` is `""` for ~1036 pre-2000s races). Using `race.fullTitle ?? fallback` returns `""` (empty heading), not the fallback. Always use `race.fullTitle || fallback` when the field might contain an empty string. If unsure, query: `SELECT COUNT(*) FROM grandsprix WHERE fullTitle = ''`.

**`gp.shortTitle`** — Contains the location only (e.g. `"Australia"`, `"Monaco"`, `"Germany"`), not the full event name. Append `' Grand Prix'` when constructing display strings, e.g. `CONCAT(YEAR(gp.date),' ',gp.shortTitle,' Grand Prix')`.

**Multi-section build combining** — When a deploy fixes bugs in two separate sections (e.g. seasons + records), run each build mode in sequence rather than a full rebuild: `build:A` then `build:B`. The second build's prebuild snapshots A's output, rebuilds only B, then restores A's output. The final `out/` contains both fixes. No full rebuild needed.

**Manual `.build-config.json`** — When writing this file via PowerShell, always use `-Encoding ASCII` to avoid the BOM that breaks `JSON.parse` in Node: `Set-Content -Path ".build-config.json" -Value '{"mode":"allraces","races":"all"}' -Encoding ASCII`. To rebuild all races (no `build:races` script exists), write `{"mode":"allraces","races":"all"}` and run `npm run build` directly.

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
