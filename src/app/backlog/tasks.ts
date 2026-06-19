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
      { id: "KF1-D-01", title: "Make columns sortable",       complexity: "S", status: "pending", description: "Click column headers to sort by any stat with ascending/descending toggle." },
      { id: "KF1-D-02", title: "Filter to current drivers",   complexity: "S", status: "pending", description: "Toggle to show only drivers active in the current season." },
      { id: "KF1-D-03", title: "Filter Indy 500 drivers out", complexity: "S", status: "pending", description: "Hide drivers whose only appearances were the Indianapolis 500 rounds (1950–1960)." },
      { id: "KF1-D-05", title: "Flag icons",                  complexity: "S", status: "pending", description: "Show a nationality flag beside each driver using ISO country codes from the nationalities table." },
      { id: "KF1-D-06", title: "Poles column",                complexity: "S", status: "pending", description: "Add a pole positions column to the drivers list." },
      { id: "KF1-D-07", title: "Fastest laps column",         complexity: "S", status: "pending", description: "Add a fastest laps column to the drivers list." },
      { id: "KF1-D-08", title: "Champion icons",              complexity: "S", status: "pending", description: "Show a visual indicator beside drivers who have won a World Championship." },
      { id: "KF1-D-09", title: "Championships count",         complexity: "S", status: "pending", description: "Show the number of World Championships won on the drivers list and detail pages." },
      { id: "KF1-D-10", title: "Ranks to statistics",         complexity: "S", status: "pending", description: "Show each driver's all-time rank for wins, podiums, points, poles, and fastest laps." },
      { id: "KF1-D-11", title: "Milestones",                  complexity: "M", status: "pending", description: "Highlight career milestones (100th start, maiden win, first pole, etc.) on the driver detail page." },
      { id: "KF1-D-12", title: "Full results breakdown",      complexity: "M", status: "pending", description: "Race-by-race results table on the driver detail page showing every start with grid, finish, points, and notes." },
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
    ],
  },
  {
    label: "Seasons",
    tasks: [
      { id: "KF1-S-01", title: "Champion wins and points",   complexity: "S", status: "pending", description: "Show the champion's win count and total points alongside their name on the seasons list." },
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
  { id: "KF1-D-04", title: "Add page footer", version: "v6.00beta" },
];
