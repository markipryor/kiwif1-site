# KiwiF1 Site — Active Tasks

This file tracks in-progress and recently completed work across sessions. Updated as tasks are started, completed, and deployed. Survives laptop reboots and session resets.

---

## Current situation (2026-07-18)

**Git is behind the live site.** Versions v6.4.5 through v6.4.10 were deployed to Vercel but never committed to GitHub. The commit history jumps from v6.4.4 → v6.4.11. Additionally, 9 source files and a new `src/app/records/constructors/` directory have local changes beyond the last commit (v6.4.12) that are also uncommitted.

**No deploys until:**
1. The uncommitted local changes are understood and committed
2. CLAUDE.md workflow is fixed so commit happens before deploy going forward

---

## Uncommitted local changes (as of 2026-07-18)

These files differ from the last git commit (v6.4.12) and have NOT been deployed or committed:

| File | Lines changed |
|------|--------------|
| `src/lib/queries.ts` | +467 / -217 |
| `src/app/seasons/[year]/page.tsx` | +109 / -... |
| `src/app/records/RecordsClient.tsx` | +101 / -... |
| `src/app/records/[category]/page.tsx` | +78 / -... |
| `src/app/constructors/[id]/page.tsx` | +16 / -... |
| `src/app/drivers/[id]/page.tsx` | +16 / -... |
| `src/app/races/[id]/page.tsx` | +18 / -... |
| `src/app/records/page.tsx` | +6 / -... |
| `src/lib/types.ts` | +2 / -... |
| `src/app/records/constructors/` | NEW (untracked directory) |

**What these likely represent:** Work done in the session before the laptop reboot. Nature of changes unknown until reviewed.

**Action needed:** Review the diff, understand what the changes do, then commit before any future deploy.

---

## Laravel backend (kiwif1) — uncommitted work (2026-07-18)

| Item | Status |
|------|--------|
| `database/migrations/2026_06_03_000020_create_penalties_table.php` | Created this session — untracked |
| `database/migrations/2026_06_03_000021_create_resultpenalties_table.php` | Rewritten this session — untracked |
| `database/seeders/PenaltiesSeeder.php` | Pre-existing — untracked |
| `BACKLOG.md` | Updated this session (R7/R8/R9 marked done) — modified |

Both migrations have been run. The `penalties` table has 71 rows seeded. `resultpenalties` is empty, ready for data entry UI work.

---

## In progress

### result_penalties data entry UI
Redesign the data entry UI for race results to replace the free-text `notes` field with structured penalty fields via the new `resultpenalties` table.

**Schema (resultpenalties):**
- `result_id` — FK to results
- `type` — enum: `time_penalty`, `grid_penalty`, `stop_and_go`, `drive_through`, `disqualification`, `pit_lane_start`, `back_of_grid`
- `amount` — nullable integer (seconds or grid places)
- `unit` — nullable enum: `seconds`, `grid_places`
- `penalty_id` — FK to penalties (the reason/description)
- `previous_place` — nullable integer (place before penalty applied)

**Status:** Tables created and migrated. UI not started.

**Next steps:** Build admin UI for entering penalties via `resultpenalties`, wired to the dropdowns from the `penalties` reference table.

---

## Backlog tasks currently pending (kiwif1-site)

Key items from `tasks.ts` that are `pending` or `deployed` (not yet confirmed done):

| ID | Title | Status |
|----|-------|--------|
| KF1-C-15 | Fix team histories | **done 19 Jul 2026** |
| KF1-C-05 | More nationality data | pending |
| KF1-D-ENH-09 | Redesign penalty section on driver page | pending |
| KF1-D-ENH-14 | Driver fact card before season table | pending |
| KF1-D-ENH-21 | Driver bios | pending |
| KF1-R-02 | Additional records | deployed v6.4.9 |
| KF1-R-BUG-01 | Most Points full list missing Current badge + =N ranks | deployed v6.4.12 |
| KF1-S-ENH-07 | F1 championship tiebreaker rules | deployed v6.4.9 |
| KF1-C-17 | Show current WDC position on constructor page | deployed v6.4.9 |
| KF1-COMP-ENH-06 | Factor sprint races into teammate comparisons | pending |
| KF1-X-03 | Remote triggers for build/deploy | pending |
| KF1-X-07 | Fix invisible JavaScript errors | pending |
| KF1-X-10 | Reduce confirmation prompts | pending |
| KF1-X-11 | Improve column spacing on race results table | pending |
| KF1-DI-01 | Verify driver champions 1950–2025 (1958/1979 bugs) | pending |
| KF1-DI-02 | Drop-rule edge cases (1958/1979) | pending |
| KF1-DI-03 | Verify constructor champions 1958–2025 | pending |

---

## Notes log

### 2026-07-19
- KF1-C-15 closed: all 13 constructor chains audited. Fixes applied to Renault (missing 1977 stint), Lotus (missing 1958 stint), Aston Martin (missing 1959 stint), Honda (missing 1964 stint), Mercedes (missing 1954 stint), Jordan (1950 data error). BMW Sauber entrant data corrected (2006–2010 = 89 races). All chains verified clean.

### 2026-07-18
- Diagnosed git/deploy gap: v6.4.5–v6.4.10 deployed but never committed. Root cause: commit was step 10 (after deploy) in CLAUDE.md workflow. Fixed to step 7a (before deploy).
- Created this TASKS.md file for persistent cross-session task tracking.
- `resultpenalties` migration rewritten with new schema (type, amount, unit, penalty_id, previous_place). Rolled back old migration, rewrote, re-ran.
- Confirmed `penalties` reference table already seeded with 71 rows.
- kiwif1 BACKLOG.md updated: R7 (Catalunya), R8 (Austria), R9 (GB) marked done.
- User instruction: no deploys until uncommitted local changes are resolved.
