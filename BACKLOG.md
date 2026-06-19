# KiwiF1 Next.js App — Backlog

Complexity: S = a session or two, M = several sessions, L = weeks of work, XL = major project milestone.

---

## Done

- [x] **KF1-D-04** · Add page footer

---

## Drivers Page

## KF1-D-01 · Make columns sortable
**Complexity: S**
Allow users to click column headers on the drivers list to sort by any column (name, nationality, races, wins, podiums, points, etc). Client-side sort with ascending/descending toggle and a visible sort indicator.

## KF1-D-02 · Filter to current drivers only
**Complexity: S**
Add a toggle on the drivers page to show only drivers active in the current season. Uses the `current` flag on the drivers table.

## KF1-D-03 · Filter Indy 500 drivers out
**Complexity: S**
Drivers who only appeared in the Indianapolis 500 (counted as a World Championship round 1950–1960) inflate the driver count and clutter the list. Add a toggle or default filter to hide Indy-only entries. Use the `indyOnly` flag or derive from race data.

## KF1-D-05 · Add flag icons
**Complexity: S**
Show a small nationality flag next to each driver's name or nationality column. Use ISO country codes already available via the nationalities table to map to flag images or a flag emoji/icon set.

## KF1-D-06 · Add poles column
**Complexity: S**
Add a pole positions column to the drivers list table, sourced from the `poletimes` table join already used elsewhere in the app.

## KF1-D-07 · Add fastest laps column
**Complexity: S**
Add a fastest laps column to the drivers list, sourced from the `fastestlaps` table.

## KF1-D-08 · Add champion icons
**Complexity: S**
Display a visual indicator (e.g. star or trophy icon) beside drivers who have won a World Championship. Derive from season standings data.

## KF1-D-09 · Add championships count
**Complexity: S**
Show the number of World Championships each driver has won as a column or stat on the drivers list and driver detail pages.

## KF1-D-10 · Add ranks to statistics
**Complexity: S**
Show the driver's all-time rank for each stat (wins, podiums, points, poles, fastest laps) on the driver detail page, e.g. "3rd all-time in wins".

## KF1-D-11 · Add milestones
**Complexity: M**
Highlight notable career milestones on the driver detail page — e.g. 100th race start, 50th win, maiden win, first pole. Pull from race result and standings data and display as a timeline or list.

## KF1-D-12 · Add full results breakdown
**Complexity: M**
Add a full race-by-race results table to the driver detail page, showing every start with date, grand prix, grid, finish, points, and notes (DNF reason etc). Currently only season-aggregated stats are shown.
