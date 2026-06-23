export type Complexity = "S" | "M" | "L" | "XL";
export type Status = "pending" | "done";

export interface Task {
  id: string;
  title: string;
  complexity: Complexity;
  description: string;
  status: Status;
  version?: string;
}

export interface Section {
  label: string;
  tasks: Task[];
}

export const sections: Section[] = [
  {
    label: "Drivers",
    tasks: [
      { id: "KF1-D-01", title: "Make columns sortable",       complexity: "S", status: "done", version: "v6.0.3beta", description: "Click column headers to sort by any stat with ascending/descending toggle." },
      { id: "KF1-D-02", title: "Filter to current drivers",   complexity: "S", status: "done", version: "v6.0.4beta", description: "Toggle to show only drivers active in the current season." },
      { id: "KF1-D-03", title: "Filter Indy 500 drivers out", complexity: "S", status: "done", version: "v6.0.3beta", description: "Hide drivers whose only appearances were the Indianapolis 500 rounds (1950–1960)." },
      { id: "KF1-D-05", title: "Flag icons",                  complexity: "S", status: "done", version: "v6.0.5beta", description: "Show a nationality flag beside each driver using ISO country codes from the nationalities table." },
      { id: "KF1-D-06", title: "Poles column",                complexity: "S", status: "done", version: "v6.0.4beta", description: "Add a pole positions column to the drivers list." },
      { id: "KF1-D-07", title: "Fastest laps column",         complexity: "S", status: "done", version: "v6.0.4beta", description: "Add a fastest laps column to the drivers list." },
      { id: "KF1-D-08", title: "Champion icons",              complexity: "S", status: "done", version: "v6.0.5beta", description: "Show a visual indicator beside drivers who have won a World Championship." },
      { id: "KF1-D-09", title: "Championships count",         complexity: "S", status: "done", version: "v6.0.5beta", description: "Show the number of World Championships won on the drivers list and detail pages." },
      { id: "KF1-D-10", title: "Ranks to statistics",         complexity: "S", status: "done", version: "v6.0.9beta", description: "Show each driver's all-time rank for wins, podiums, points, poles, and fastest laps on the driver detail stat cards. Rank is hidden for zero values." },
      { id: "KF1-D-12", title: "Full results breakdown",      complexity: "M", status: "done", version: "v6.0.9beta", description: "Expandable season rows on the driver detail page showing each race with title (fullTitle if set, else '{year} {adjective} Grand Prix' using nationality adjective from DB, or '{year} Indianapolis 500'; US races use 'United States' not 'American'), grid, finish, fastest lap (purple FL column), and points. Race titles link to individual race pages. Fixed stale race page cache — all 1171 races fully generated." },
      { id: "KF1-D-BUG-01", title: "Bug: Spurious 0s after driver names", complexity: "S", status: "done", version: "v6.0.4beta", description: "MySQL returns tinyint(1) fields as 0/1 numbers; JSX short-circuit {0 && <span>} renders a literal 0. Fixed by coercing to Boolean() in page.tsx map." },
      { id: "KF1-D-BUG-02", title: "Bug: Flag icons not showing",          complexity: "S", status: "done", version: "v6.0.6beta", description: "Flag icons not displaying on the drivers list. CDN link is in layout but flags are absent — likely a CSS class or code path issue." },
      { id: "KF1-D-BUG-03", title: "Bug: Senna shows 2 championships (should be 3)", complexity: "S", status: "done", version: "v6.0.7beta", description: "Championship count query returning 2 for Senna instead of 3. Root cause: 1988 raw points gave Prost the win (105 vs 94); fixed by applying the 'best N results' drop rule per season via seasonPtsCTE() with window functions." },
      { id: "KF1-D-BUG-04", title: "Bug: No numbers in poles/fastest laps on driver page", complexity: "S", status: "done", version: "v6.0.6beta", description: "Poles and Fastest Laps stat cards on the individual driver page are showing blank instead of numbers." },
      { id: "KF1-D-BUG-05", title: "Bug: Death date showing for living drivers", complexity: "S", status: "done", version: "v6.0.6beta", description: "The date of death is appearing on driver detail pages for drivers who are still alive. Likely a null check issue." },
      { id: "KF1-D-FIX-01", title: "Fix: Championship stars in own left column", complexity: "S", status: "done", version: "v6.0.6beta", description: "Move championship stars to a dedicated sortable column on the left of the table, removing the separate championships count column." },
      { id: "KF1-D-FIX-02", title: "Fix: Remove number next to stars on driver page", complexity: "S", status: "done", version: "v6.0.6beta", description: "The Championships stat card shows '★★★ 3' — the number is redundant. Show stars only." },
      { id: "KF1-D-ENH-01", title: "Flag icon on driver detail page",      complexity: "S", status: "done", version: "v6.0.6beta", description: "Show the driver's nationality flag on their individual page alongside the nationality text." },
      { id: "KF1-D-ENH-02", title: "Current/Indy indicator on driver page", complexity: "S", status: "done", version: "v6.0.6beta", description: "Show a 'Current' or 'Indy' badge on the individual driver detail page header." },
      { id: "KF1-D-ENH-03", title: "Teammates per year in season table",   complexity: "S", status: "done", version: "v6.0.7beta", description: "On the driver detail page, show teammate name(s) alongside each season row in the season-by-season breakdown." },
      { id: "KF1-D-ENH-04", title: "Championship position in season table", complexity: "S", status: "done", version: "v6.0.7beta", description: "Show the driver's final championship standing (e.g. P1, P2) for each season in the season-by-season table." },
      { id: "KF1-D-BUG-06", title: "Bug: Incorrect nationality text for some drivers", complexity: "S", status: "done", version: "v6.0.8beta", description: "Some drivers show the correct flag but wrong nationality label — e.g. Leclerc shows the Monaco flag but says 'Australian'. Fixed by updating the adjective field in the nationalities table for 15 nationalities including Monaco (Monegasque), Netherlands (Dutch), Uruguay, Azerbaijan, and others." },
      { id: "KF1-D-ENH-05", title: "Default sort by last name on drivers list", complexity: "S", status: "done", version: "v6.0.8beta", description: "Change the default sort order on the all-drivers view from wins descending to surname ascending, so drivers are listed alphabetically on first load." },
      { id: "KF1-D-ENH-06", title: "Wrap championship stars onto two rows for 5+ titles", complexity: "S", status: "done", version: "v6.0.8beta", description: "Drivers with 5 stars (Fangio) or 7 stars (Schumacher, Hamilton) now show stars in two rows using a ceil/floor split (5→3+2, 7→4+3) on both the drivers list and driver detail page." },
      { id: "KF1-D-ENH-07", title: "First/last race as text with full race name", complexity: "S", status: "done", version: "v6.0.8beta", description: "On the driver detail page, First race and Last race are now shown as plain text below the stat cards with the full race name and year. Current drivers show 'Latest race' instead of 'Last race'." },
      { id: "KF1-D-ENH-08", title: "Championships box on its own row above stats", complexity: "S", status: "done", version: "v6.0.8beta", description: "On the driver detail page, the Championships banner now appears in its own amber-tinted row above the stat cards and is hidden entirely for drivers with no titles. The 7 remaining stats fit on one row." },
    ],
  },
  {
    label: "Constructors",
    tasks: [
      { id: "KF1-C-01", title: "Make columns sortable",                complexity: "S", status: "pending", description: "Click column headers on the constructors list to sort by any stat." },
      { id: "KF1-C-02", title: "Add filters",                          complexity: "S", status: "pending", description: "Filter constructors by nationality, active/inactive, or era." },
      { id: "KF1-C-03", title: "Flag icons",                           complexity: "S", status: "pending", description: "Show a nationality flag beside each constructor." },
      { id: "KF1-C-04", title: "Champion icons",                       complexity: "S", status: "pending", description: "Visual indicator for constructors who have won the Constructors' Championship." },
      { id: "KF1-C-05", title: "More nationality data",                complexity: "S", status: "pending", description: "Expand nationality coverage — many constructors currently have no nationality set." },
      { id: "KF1-C-06", title: "Simplify multi-line displays",         complexity: "S", status: "pending", description: "The driver list in season-by-season rows can be very long — truncate or collapse it." },
      { id: "KF1-C-07", title: "Full names and short names",           complexity: "S", status: "pending", description: "Show both the full constructor name and short name where space allows; use short name in compact views." },
      { id: "KF1-C-08", title: "Season stats broken down by driver",   complexity: "M", status: "pending", description: "Expand each season row on the constructor detail page to show each driver's individual contribution." },
      { id: "KF1-C-09", title: "Add ranks",                           complexity: "S", status: "pending", description: "Show all-time rank for each stat (wins, podiums, points, titles) on the constructor detail page." },
      { id: "KF1-C-10", title: "History data for all teams",          complexity: "L", status: "pending", description: "Add formedFrom/became chain data for all relevant constructor lineages, not just Mercedes." },
      { id: "KF1-C-BUG-01", title: "Bug: Some constructor names not showing", complexity: "S", status: "done", version: "v6.0.6beta", description: "Constructor names are blank in some places — likely rows where both name and shortName are empty, or a JOIN returning null." },
    ],
  },
  {
    label: "Seasons",
    tasks: [
      { id: "KF1-S-01", title: "Champion wins and points",   complexity: "S", status: "pending", description: "Show the champion's win count and total points alongside their name on the seasons list." },
      { id: "KF1-S-02", title: "Milestones",                 complexity: "M", status: "pending", description: "Highlight key season milestones — first win, first pole, championship clinch race, etc. on the season detail page." },
      { id: "KF1-S-ENH-01", title: "Show championship leader for current season", complexity: "S", status: "pending", description: "The seasons list currently shows the points leader for the current season as if they are the champion. For the current (incomplete) season, label them as 'Leader' rather than treating them as champion." },
    ],
  },
  {
    label: "Comparisons",
    tasks: [
      { id: "KF1-COMP-BUG-01", title: "Bug: Comparison page lost styling",          complexity: "S", status: "done", version: "v6.0.6beta", description: "Comparison pages appear unstyled — likely caused by the cached HTML being out of date with the current CSS bundle hash after a rebuild." },
      { id: "KF1-COMP-BUG-02", title: "Bug: Some comparison pages returning 404",   complexity: "S", status: "pending", description: "Some driver vs driver comparison pages are returning 404. May be missing from the cached set or not generated during build. Need to identify which pairs are affected and whether it's a cache gap or a generateStaticParams issue." },
      { id: "KF1-COMP-BUG-03", title: "Bug: Comparison page styling not applied",   complexity: "S", status: "done", version: "v6.0.8beta", description: "Comparison pages were losing styling after each build because Turbopack filenames are pure hashes (no name-HASH.ext pattern), so the old hash-stripping regex never matched. Fixed by positionally replacing all /_next/static/ references in cached pages using the freshly-built comparison page as the source of truth." },
      { id: "KF1-COMP-ENH-01", title: "Remove races rows from comparison table",    complexity: "S", status: "done", version: "v6.0.6beta", description: "Remove the individual race result rows from the head-to-head table to declutter the comparison view." },
      { id: "KF1-COMP-ENH-02", title: "Add qualifying comparison",                  complexity: "S", status: "done", version: "v6.0.6beta", description: "Show qualifying head-to-head (who outqualified who and by how much) for shared seasons." },
      { id: "KF1-COMP-ENH-03", title: "Add finishing position comparison",          complexity: "S", status: "pending", description: "Show finishing position head-to-head breakdown for shared seasons." },
      { id: "KF1-COMP-ENH-04", title: "Race count next to year on comparison page", complexity: "S", status: "pending", description: "Show the number of races in each shared season next to the year heading on the comparison page." },
      { id: "KF1-COMP-ENH-05", title: "Versus all teammates page",                  complexity: "M", status: "pending", description: "Add a dedicated page for each driver showing aggregated head-to-head stats versus every teammate they've ever had." },
    ],
  },
  {
    label: "Records",
    tasks: [
      { id: "KF1-R-01", title: "Full list pages per record", complexity: "S", status: "pending", description: "Add a 'More' link on each record card to a dedicated page listing all drivers with more than 0 for that stat." },
      { id: "KF1-R-02", title: "Additional records",         complexity: "M", status: "pending", description: "Add new record categories: most grand slams (win + pole + fastest lap + led every lap), most race starts without a win, and others." },
    ],
  },
  {
    label: "Site",
    tasks: [
      { id: "KF1-X-01", title: "Data validation",       complexity: "M", status: "pending", description: "Audit all data for accuracy — cross-check points totals, standings, race results, and pole positions against official sources." },
      { id: "KF1-X-02", title: "Test all functionality", complexity: "M", status: "pending", description: "Full functional test pass across all pages and edge cases: missing data, single-race constructors, shared drives, DNS/DNQ entries." },
    ],
  },
];

export const deployed: { version: string; changes: string[] }[] = [
  {
    version: "v6.0.9beta",
    changes: [
      "Driver pages: All-time rank shown on each stat card (wins, podiums, points, poles, fastest laps) — hidden for zero values",
      "Driver pages: Season rows now expandable to show race-by-race results (race name, grid, finish, fastest lap, points)",
      "Driver pages: Race titles use nationality adjective (e.g. 'Australian Grand Prix' not 'Australia Grand Prix'); US races show 'United States Grand Prix'; Indianapolis 500 preserved as-is",
      "Driver pages: Purple FL column in race results where fastest lap was set",
      "Race pages: Fixed stale cache — all 1171 race pages now generated and linked correctly",
    ],
  },
  {
    version: "v6.0.8beta",
    changes: [
      "Drivers: Default sort changed to surname A→Z",
      "Drivers: Championship stars wrap to two rows for 5+ titles (ceil/floor split)",
      "Driver pages: Championship banner shown in own amber row above stats; hidden if no titles",
      "Driver pages: First/last race shown as plain text with full race name; current drivers say 'Latest race'",
      "Driver pages: Nationality text fixed for 15 nationalities (Monegasque, Dutch, etc.)",
      "Comparison pages: CSS/JS hash patching fixed — positional replacement now works reliably with Turbopack",
    ],
  },
  {
    version: "v6.0.7beta",
    changes: [
      "Driver pages: Senna now correctly shows 3 championships (best-N-results drop rule applied)",
      "Driver pages: Season table now shows championship position (P1, P2, etc.) per season",
      "Driver pages: Season table now shows teammate name(s) per season",
    ],
  },
  {
    version: "v6.0.6beta",
    changes: [
      "Drivers: Flag icons now showing (local assets, ISO 2-letter codes added to DB)",
      "Drivers: Championship stars moved to dedicated sortable leftmost column",
      "Drivers: Stars-only on driver detail page (removed redundant number)",
      "Driver pages: Flag icon shown alongside nationality text",
      "Driver pages: Current / Indy 500 only badge in header",
      "Driver pages: Poles and Fastest Laps stats now populated",
      "Driver pages: Death date no longer shown for living drivers",
      "Constructor pages: Blank constructor names fixed (COALESCE fallback to shortName)",
      "Comparison pages: Styling restored (CSS hash patching on cached pages)",
      "Comparison pages: Races rows removed",
      "Comparison pages: Qualifying head-to-head added",
    ],
  },
  {
    version: "v6.0.5beta",
    changes: [
      "Drivers: Nationality column replaced with flag icon (hover to see name)",
      "Drivers: Championship stars shown next to driver name (★ per title)",
      "Drivers: Championships column added (sortable)",
      "Driver pages: Championships, Poles and Fastest Laps added to stats",
    ],
  },
  {
    version: "v6.0.4beta",
    changes: [
      "Drivers: Poles and Fastest Laps columns added",
      "Drivers: Current drivers filter toggle (default: all)",
      "Drivers: Fixed spurious 0s appearing after driver name badges",
    ],
  },
  {
    version: "v6.0.3beta",
    changes: [
      "Drivers: Sortable columns (click any header to sort)",
      "Drivers: Indy 500 filter — excluded by default, toggle to include",
    ],
  },
  {
    version: "v6.0.1beta",
    changes: [
      "Records: Added 2026 points system column to Most Points table",
      "Records: Sortable columns on Most Points table",
      "Constructor pages: Team History section showing full name lineage with year ranges",
      "Upcoming Features & Kanban board pages",
    ],
  },
  {
    version: "v6.00beta",
    changes: [
      "Page footer with copyright, contact, and version number",
    ],
  },
];

export const done: { id: string; title: string; version: string }[] = [
  { id: "KF1-D-BUG-06", title: "Bug: Incorrect nationality text for some drivers", version: "v6.0.8beta" },
  { id: "KF1-D-ENH-05", title: "Default sort by last name on drivers list", version: "v6.0.8beta" },
  { id: "KF1-D-ENH-06", title: "Wrap championship stars onto two rows for 5+ titles", version: "v6.0.8beta" },
  { id: "KF1-D-ENH-07", title: "First/last race as text with full race name", version: "v6.0.8beta" },
  { id: "KF1-D-ENH-08", title: "Championships box on its own row above stats", version: "v6.0.8beta" },
  { id: "KF1-COMP-BUG-03", title: "Bug: Comparison page styling not applied", version: "v6.0.8beta" },
  { id: "KF1-D-BUG-03", title: "Bug: Senna shows 2 championships (should be 3)", version: "v6.0.7beta" },
  { id: "KF1-D-ENH-03", title: "Teammates per year in season table", version: "v6.0.7beta" },
  { id: "KF1-D-ENH-04", title: "Championship position in season table", version: "v6.0.7beta" },
  { id: "KF1-D-BUG-02", title: "Bug: Flag icons not showing", version: "v6.0.6beta" },
  { id: "KF1-D-BUG-04", title: "Bug: No numbers in poles/fastest laps on driver page", version: "v6.0.6beta" },
  { id: "KF1-D-BUG-05", title: "Bug: Death date showing for living drivers", version: "v6.0.6beta" },
  { id: "KF1-D-FIX-01", title: "Fix: Championship stars in own left column", version: "v6.0.6beta" },
  { id: "KF1-D-FIX-02", title: "Fix: Remove number next to stars on driver page", version: "v6.0.6beta" },
  { id: "KF1-D-ENH-01", title: "Flag icon on driver detail page", version: "v6.0.6beta" },
  { id: "KF1-D-ENH-02", title: "Current/Indy indicator on driver page", version: "v6.0.6beta" },
  { id: "KF1-C-BUG-01", title: "Bug: Some constructor names not showing", version: "v6.0.6beta" },
  { id: "KF1-COMP-BUG-01", title: "Bug: Comparison page lost styling", version: "v6.0.6beta" },
  { id: "KF1-COMP-ENH-01", title: "Remove races rows from comparison table", version: "v6.0.6beta" },
  { id: "KF1-COMP-ENH-02", title: "Add qualifying comparison", version: "v6.0.6beta" },
  { id: "KF1-D-05", title: "Flag icons", version: "v6.0.5beta" },
  { id: "KF1-D-08", title: "Champion icons", version: "v6.0.5beta" },
  { id: "KF1-D-09", title: "Championships count", version: "v6.0.5beta" },
  { id: "KF1-D-02", title: "Filter to current drivers", version: "v6.0.4beta" },
  { id: "KF1-D-06", title: "Poles column", version: "v6.0.4beta" },
  { id: "KF1-D-07", title: "Fastest laps column", version: "v6.0.4beta" },
  { id: "KF1-D-BUG-01", title: "Bug: Spurious 0s after driver names", version: "v6.0.4beta" },
  { id: "KF1-D-01", title: "Make columns sortable", version: "v6.0.3beta" },
  { id: "KF1-D-03", title: "Filter Indy 500 drivers out", version: "v6.0.3beta" },
  { id: "KF1-D-04", title: "Add page footer", version: "v6.00beta" },
];
