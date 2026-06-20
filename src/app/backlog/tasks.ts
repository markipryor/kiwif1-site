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
      { id: "KF1-D-10", title: "Ranks to statistics",         complexity: "S", status: "pending", description: "Show each driver's all-time rank for wins, podiums, points, poles, and fastest laps." },
      { id: "KF1-D-12", title: "Full results breakdown",      complexity: "M", status: "pending", description: "Race-by-race results table on the driver detail page showing every start with grid, finish, points, and notes." },
      { id: "KF1-D-BUG-01", title: "Bug: Spurious 0s after driver names", complexity: "S", status: "done", version: "v6.0.4beta", description: "MySQL returns tinyint(1) fields as 0/1 numbers; JSX short-circuit {0 && <span>} renders a literal 0. Fixed by coercing to Boolean() in page.tsx map." },
      { id: "KF1-D-BUG-02", title: "Bug: Flag icons not showing",          complexity: "S", status: "pending", description: "Flag icons not displaying on the drivers list. CDN link is in layout but flags are absent — likely a CSS class or code path issue." },
      { id: "KF1-D-BUG-03", title: "Bug: Senna shows 2 championships (should be 3)", complexity: "S", status: "pending", description: "Championship count query returning 2 for Senna instead of 3. Likely a points tie-break or data issue in the season_pts CTE." },
      { id: "KF1-D-BUG-04", title: "Bug: No numbers in poles/fastest laps on driver page", complexity: "S", status: "pending", description: "Poles and Fastest Laps stat cards on the individual driver page are showing blank instead of numbers." },
      { id: "KF1-D-BUG-05", title: "Bug: Death date showing for living drivers", complexity: "S", status: "pending", description: "The date of death is appearing on driver detail pages for drivers who are still alive. Likely a null check issue." },
      { id: "KF1-D-FIX-01", title: "Fix: Championship stars in own left column", complexity: "S", status: "pending", description: "Move championship stars to a dedicated sortable column on the left of the table, removing the separate championships count column." },
      { id: "KF1-D-FIX-02", title: "Fix: Remove number next to stars on driver page", complexity: "S", status: "pending", description: "The Championships stat card shows '★★★ 3' — the number is redundant. Show stars only." },
      { id: "KF1-D-ENH-01", title: "Flag icon on driver detail page",      complexity: "S", status: "pending", description: "Show the driver's nationality flag on their individual page alongside the nationality text." },
      { id: "KF1-D-ENH-02", title: "Current/Indy indicator on driver page", complexity: "S", status: "pending", description: "Show a 'Current' or 'Indy' badge on the individual driver detail page header." },
      { id: "KF1-D-ENH-03", title: "Teammates per year in season table",   complexity: "S", status: "pending", description: "On the driver detail page, show teammate name(s) alongside each season row in the season-by-season breakdown." },
      { id: "KF1-D-ENH-04", title: "Championship position in season table", complexity: "S", status: "pending", description: "Show the driver's final championship standing (e.g. P1, P2) for each season in the season-by-season table." },
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
      { id: "KF1-C-BUG-01", title: "Bug: Some constructor names not showing", complexity: "S", status: "pending", description: "Constructor names are blank in some places — likely rows where both name and shortName are empty, or a JOIN returning null." },
    ],
  },
  {
    label: "Seasons",
    tasks: [
      { id: "KF1-S-01", title: "Champion wins and points",   complexity: "S", status: "pending", description: "Show the champion's win count and total points alongside their name on the seasons list." },
      { id: "KF1-S-02", title: "Milestones",                 complexity: "M", status: "pending", description: "Highlight key season milestones — first win, first pole, championship clinch race, etc. on the season detail page." },
    ],
  },
  {
    label: "Comparisons",
    tasks: [
      { id: "KF1-COMP-BUG-01", title: "Bug: Comparison page lost styling",          complexity: "S", status: "pending", description: "Comparison pages appear unstyled — likely caused by the cached HTML being out of date with the current CSS bundle hash after a rebuild." },
      { id: "KF1-COMP-ENH-01", title: "Remove races rows from comparison table",    complexity: "S", status: "pending", description: "Remove the individual race result rows from the head-to-head table to declutter the comparison view." },
      { id: "KF1-COMP-ENH-02", title: "Add qualifying comparison",                  complexity: "S", status: "pending", description: "Show qualifying head-to-head (who outqualified who and by how much) for shared seasons." },
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
