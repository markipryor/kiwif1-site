# KiwiF1 Data Integrity — Action Items

Living to-do list. Add items when new issues are found; mark resolved when fixed and deployed. Keep resolved items so the log stays useful.

---

## Outstanding — Code / Display

- [ ] **1969 drop rule: verify and likely remove.** `seasonPtsCTE` has `WHEN 1969 THEN 6` and `DROP_RULE_BEST_N` has `1969: 6`. Wikipedia shows gross totals matching official (Stewart 63, Ickx 37, McLaren 26) — consistent with no drop rule. If confirmed all-11-counted, change both to `999` / remove the 1969 entry. Also check 1968, 1967, 1966 rules while at it — the best-N values in code were originally researched but not formally verified against Wikipedia for each year. *(Found: 2026-07-23)*

- [ ] **Pre-1991 constructor standings: implement per-race best-car rule (DI-03).** Official WCC 1961–1967 counted only the single best-placed car per constructor per race. 1968–1970 counted top 2 cars. Our site sums all drivers — constructor champions are wrong for many pre-1991 seasons (e.g. 1965 shows BRM champion, official was Lotus; 1970 shows Ferrari champion, official was Lotus). Complex query rewrite needed. *(Found: 2026-07-01, confirmed extent 2026-07-23)*

---

## Outstanding — Data Fixes (DB)

- [ ] **1968 McLaren Spain: remove spurious 1 pt.** `results` row for McLaren at 1968 Spanish GP has `position=6, place=DNF`. The points formula uses `position`, awarding 1 pt. McLaren did not finish Spain 1968 and his official total (22) excludes it. Fix: set `fullPointsDriver=0` for that row, or correct `position` to a non-scoring value. *(Found: 2026-07-23)*

- [ ] **1967 Brabham: investigate +2 pt discrepancy.** DB gives Brabham 48 net (gross also 48, since both drops are 0-point DNFs). Official is 46. All 11 individual race positions verified correct against Wikipedia. The 2-point gap is unexplained. Possible angles: (a) check if there was a race where Brabham shared a car and should only get half-points; (b) check if any 1967 race awarded reduced points due to distance/format; (c) verify the official source — Wikipedia may itself have an error. *(Found: 2026-07-23)*

- [ ] **1958 and 1979 drop rule / data bugs (DI-01/02).** Drop rule produces wrong champion for both years. 1958: DB picks Moss (38 net) over Hawthorn — should be Hawthorn (42 vs 41 in net counting). 1979: DB picks Villeneuve (53 net) over Scheckter — should be Scheckter (51 vs 47 net). Root cause likely combination of wrong best-N value and/or incorrect individual race results. *(Found: 2026-07-01)*

---

## Outstanding — Seasons Not Yet Checked

- [ ] **1960–1950 driver standings not checked.** Pre-1961 points system is different (8/5/4/3/2 or 8/6/4/3/2 depending on year). The Indy 500 was a WDC round 1950–1960 but most European drivers didn't compete — this affects gross point totals. Needs verification.

- [ ] **1971–1980 driver and constructor standings not checked.** These are between the checked ranges. Constructor championship formula issue (per-race best-car rule) applies through the pre-1991 era.

- [ ] **Constructor standings all seasons pre-1991.** Once the per-race best-car rule is implemented (see code item above), verify constructor champions match official for all seasons.

---

## Resolved

- [x] **2019 Haas entrants missing** — Magnussen and Grosjean had no results. User added entrant rows. *(Fixed: 2026-07-17)*
- [x] **2002 Jordan and Minardi entrants missing** — User added entrant rows. *(Fixed: 2026-07-17)*
- [x] **2000 Arrows entrants missing** — Verstappen and de la Rosa had no results. User added entrant rows. *(Fixed: 2026-07-17)*
- [x] **Pre-1991 gross vs net display** — Season pages now apply drop rule and sort by net. Gross shown in brackets if different. *(Deployed: v6.4.14, 2026-07-23)*
- [x] **1997 Schumacher WDC exclusion** — EX marker added to 1997 driver standings. *(Deployed: v6.4.14, 2026-07-23)*
- [x] **2007 McLaren WCC exclusion** — EX marker added to 2007 constructor standings. *(Deployed: v6.4.14, 2026-07-23)*
