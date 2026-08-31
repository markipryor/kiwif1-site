# KiwiF1 Data Integrity Check Log

Append-only. Each check session is a dated section. Use this to track whether past issues have been resolved on recheck.

---

## 2026-07-17 — DI-21: Driver & Constructor standings 2025 back to 1981

**Method:** PHP script (`season_all.php`) computing site's exact totalPts() SQL vs Wikipedia/official records. Cross-checked with `drop_rule_check.php` for drop-rule net totals.

### 2025–1991 (all seasons)
- **Status: CLEAN** for all driver and constructor standings.

### 1990–1981 (drop-rule era, best 11 of N)
- **Status: CLEAN** — data correct; differences from Wikipedia are gross vs net only.
- Pre-1991 displayed gross totals (wrong order in 1988 etc.) — fixed by deploying net-points display (v6.4.14).

### Specific data issues found and fixed
| Year | Issue | Action | Status |
|------|-------|--------|--------|
| 2019 | Haas entrants missing — Magnussen and Grosjean had no results | User added entrant rows to DB | FIXED |
| 2002 | Jordan and Minardi entrants missing | User added entrant rows | FIXED |
| 2000 | Arrows entrants missing — Verstappen and de la Rosa | User added entrant rows | FIXED |

### Display-side exclusions added (v6.4.14)
| Year | Issue | Fix |
|------|-------|-----|
| 2007 | McLaren excluded from WCC by FIA (Spygate) — DB has 218 pts | EX marker added to constructor standings |
| 1997 | Schumacher excluded from WDC by FIA (Jerez collision) — DB has 78 pts | EX marker added to driver standings |

### Pre-1991 drop rule display fix (v6.4.14)
Season pages now apply the historical best-N drop rule for 1950–1990. Net points displayed as primary; gross shown in brackets if different (e.g. "Senna 90 (94)"). Sorting by net. This corrects the 1988 displayed order (Prost was incorrectly P1 on 105 gross; Senna correctly leads on 90 net).

---

## 2026-07-23 — DI-21 continued: Driver & Constructor standings 1970 back to 1961

**Method:** PHP script (`check_6170.php`) computing net driver standings (drop rule applied) and gross constructor standings for each year. Individual race results verified via Wikipedia WebFetch for suspect cases.

### Drivers 1961–1966
- **Status: CLEAN** — net points and ordering match official records exactly.

### Drivers 1967
- **Hulme 51 ✓, Clark 41 ✓**
- **Brabham: DB = 48, official = 46. DISCREPANCY (+2 pts).**
  - All 11 race results verified individually against Wikipedia — all positions confirmed correct.
  - Drop rule (best 9 of 11) applied correctly. Gross = net = 48 (Monaco and Belgium both DNF = 0, so nothing dropped that matters).
  - 2-point gap is unexplained. Could be: Wikipedia error, subtle historical rule (e.g. half-points at one race), or an unidentified DB result that is correct in position but wrong in some other field.
  - **Status: UNRESOLVED — needs further investigation.**

### Drivers 1968
- **Hill 48 ✓, Stewart 36 ✓, Hulme 33 ✓, Ickx 27 ✓**
- **McLaren: DB = 23, official = 22. DISCREPANCY (+1 pt).**
  - Spain 1968 row has `position=6, place=DNF`. Points formula uses `position`, giving 1 pt.
  - Official McLaren total is Belgium win (9) + Canada P2 (6) + Mexico P2 (6) + USA P6 (1) = 22. No Spain point.
  - McLaren did not finish Spain 1968 and should not have scored. The `position=6` is likely the retirement order (6th to retire), not a classified finishing position.
  - **Status: DB FIX NEEDED — Spain 1968 McLaren position should be corrected or fullPointsDriver set to 0.**

### Drivers 1969
- **Stewart: DB net 54 (gross 63), Ickx: DB net 36 (gross 37), McLaren: DB net 22 (gross 26).**
- Wikipedia shows Stewart 63, Ickx 37, McLaren 26 — these are gross totals.
- Our code applies `WHEN 1969 THEN 6` (best 6 of 11) in seasonPtsCTE and DROP_RULE_BEST_N.
- **If 1969 had no drop rule (all 11 rounds counted), the site incorrectly reduces all scores.**
  - Stewart gross 63 = correct if no drop. Our net 54 would be wrong.
  - Ickx gross 37 = correct if no drop. Our net 36 would be wrong.
- **Status: RULE VERIFICATION NEEDED — if confirmed no drop rule in 1969, fix both seasonPtsCTE and DROP_RULE_BEST_N.**

### Drivers 1970
- **Rindt 45 ✓, Ickx 40 ✓, Regazzoni 33 ✓** — match official exactly.
- **Status: CLEAN**

### Constructors 1961–1970
- **Status: ALL WRONG** — site sums all drivers' points per constructor per season. Official WCC rules were:
  - 1961–1967: Only the single best-placed car per constructor per race counted for WCC.
  - 1968–1970: Top 2 cars per constructor per race counted for WCC.
- This is the known DI-03 issue. Examples of ordering differences:
  - 1965: Official Lotus 54 (champion), BRM 45 → DB: BRM 83, Lotus 64 (wrong champion shown)
  - 1966: Official Brabham 42, Ferrari 31, Cooper 30 → DB: Brabham 70, Cooper 47, Ferrari 42
  - 1970: Official Lotus 59 (champion), Ferrari 52 → DB: Ferrari 76, Lotus 70 (wrong champion shown)
- **Status: KNOWN ISSUE (DI-03) — requires significant query rewrite, not yet scoped.**

---
