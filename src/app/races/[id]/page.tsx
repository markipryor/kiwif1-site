import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSeasons, getSeasonRaces, getRaceById, getRaceResults, getRacePole, getRaceFastestLap, getRaceSprintResults, getRaceMilestones, getAdjacentRaces, type MilestoneEntry } from "@/lib/queries";
import { getBuildConfig, getSeed } from "@/lib/build-config";

function ordinal(n: number): string {
  const v = n % 100;
  const s = ['th','st','nd','rd'];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const MILESTONE_TYPE_ORDER = ['start','win','podium','pole','fastestLap','points'] as const;

const MILESTONE_ICON: Record<MilestoneEntry['type'], string> = {
  start: '🚦', win: '🏆', podium: '🥉', pole: '🔵', fastestLap: '⚡', points: '●',
};

// Singular, used to build a per-threshold heading, e.g. "25th Race Start".
const MILESTONE_LABEL_SINGULAR: Record<MilestoneEntry['type'], string> = {
  start: 'Race Start',
  win: 'Win',
  podium: 'Podium',
  pole: 'Pole Position',
  fastestLap: 'Fastest Lap',
  points: 'Points',
};

// Points milestones are raw career-point thresholds (100, 250, 500...), not
// a count of times something happened, so they can't share the ordinal
// "{n}th {label}" pattern every other type uses — except n === 0, which
// represents reaching a first-ever point, consistently phrased as "1st"
// rather than the word "First" to match every other category's heading.
function milestoneHeading(type: MilestoneEntry['type'], n: number): string {
  if (type === 'points') return n === 0 ? '1st Points' : `${n} Points`;
  return `${ordinal(n)} ${MILESTONE_LABEL_SINGULAR[type]}`;
}

export async function generateStaticParams() {
  const cfg = getBuildConfig();
  const spec = cfg?.races;
  if (spec === "all") {
    const seasons = await getAllSeasons();
    const allRaces = await Promise.all(seasons.map((s) => getSeasonRaces(s.year)));
    return allRaces.flat().map((r) => ({ id: String(r.id) }));
  }
  if (Array.isArray(spec) && spec.length > 0) return spec.map((id) => ({ id: String(id) }));
  const seed = getSeed(".races_seed");
  if (seed) return [{ id: seed }];
  const seasons = await getAllSeasons();
  const allRaces = await Promise.all(seasons.map((s) => getSeasonRaces(s.year)));
  return allRaces.flat().map((r) => ({ id: String(r.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const race = await getRaceById(Number(id));
  if (!race) return {};
  const year = new Date(race.date).getFullYear();
  return { title: `${year} ${race.shortTitle} Grand Prix — KiwiF1` };
}

export default async function RacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [race, results, pole, fastestLap, sprintResults, milestones, adjacent] = await Promise.all([
    getRaceById(Number(id)),
    getRaceResults(Number(id)),
    getRacePole(Number(id)),
    getRaceFastestLap(Number(id)),
    getRaceSprintResults(Number(id)),
    getRaceMilestones(Number(id)),
    getAdjacentRaces(Number(id)),
  ]);

  if (!race) notFound();

  const year = new Date(race.date).getFullYear();
  const winner = results.find((r) => r.place === "1");

  // Milestones grouped by the exact achievement (type + threshold), e.g.
  // "1st Race Start" and "25th Race Start" are separate groups -- ordered
  // by MILESTONE_TYPE_ORDER, then ascending threshold within each type, so
  // a 1st is always listed before a 25th, never the other way around.
  const milestoneGroups = MILESTONE_TYPE_ORDER.flatMap((type) => {
    const byN = new Map<number, MilestoneEntry[]>();
    for (const m of milestones) {
      if (m.type !== type) continue;
      const existing = byN.get(m.n);
      if (existing) existing.push(m);
      else byN.set(m.n, [m]);
    }
    return [...byN.entries()]
      .sort(([a], [b]) => a - b)
      .map(([n, entries]) => ({ key: `${type}-${n}`, icon: MILESTONE_ICON[type], heading: milestoneHeading(type, n), entries }));
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-0">
        <Link href={`/seasons/${year}/`} className="text-zinc-500 hover:text-white text-sm transition-colors">
          ← {year} Season
        </Link>
        <div className="flex items-center gap-4">
          {adjacent.prevId && (
            <Link href={`/races/${adjacent.prevId}/`} className="text-zinc-500 hover:text-white text-sm transition-colors">
              ← {adjacent.prevYear} {adjacent.prevTitle}
            </Link>
          )}
          {adjacent.nextId && (
            <Link href={`/races/${adjacent.nextId}/`} className="text-zinc-500 hover:text-white text-sm transition-colors">
              {adjacent.nextYear} {adjacent.nextTitle} →
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 mb-6">
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
          {race.countryCode && (
            <span className={`fi fi-${race.countryCode.toLowerCase()} fis`} title={race.country} style={{ fontSize: "1rem" }} />
          )}
          {new Date(race.date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })} · {race.circuitCity}
        </p>
        <h1 className="text-3xl font-bold text-white">{race.fullTitle || `${year} ${race.shortTitle} Grand Prix`}</h1>
      </div>

      <div className="text-xs text-zinc-400 mb-8 grid grid-cols-[auto_auto_auto_1fr] gap-x-1.5 gap-y-1 items-baseline">
        {pole && (
          <>
            <span>🔵 Pole:</span>
            <Link href={`/drivers/${pole.driverId}/`} className="text-white hover:text-red-400 transition-colors">
              {pole.driverName}
            </Link>
            <span className="text-white font-mono">{pole.time}</span>
            <span className="text-red-400">
              {race.bestPoleTime && pole.time === race.bestPoleTime && "(new record)"}
            </span>
          </>
        )}
        {fastestLap && (
          <>
            <span>⚡ Fastest Lap:</span>
            <Link href={`/drivers/${fastestLap.driverId}/`} className="text-white hover:text-red-400 transition-colors">
              {fastestLap.driverName}
            </Link>
            <span>
              <span className="text-white font-mono">{fastestLap.time}</span> (lap {fastestLap.lap})
            </span>
            <span className="text-red-400">
              {race.bestRaceLapTime && fastestLap.time === race.bestRaceLapTime && "(new record)"}
            </span>
          </>
        )}
        {/* race.sprint is a raw 0/1 from the DB, not a real boolean -- a
            plain "race.sprint && <p>" would render a stray literal "0" on
            every non-sprint race, since React renders 0 (unlike false/
            null/undefined, which it silently skips). Explicit ternary
            avoids that regardless of the value's type. */}
        {race.sprint ? <span className="text-purple-400 col-span-4">⚡ Sprint weekend</span> : null}
      </div>

      {/* Race results */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Race Result</h2>
        <span className="text-xs text-zinc-500">🏁 <span className="text-white font-bold">{race.laps} laps</span></span>
      </div>
      <div className="mb-12">
        {/* sm and up: full table. Below sm: stacked two-line cards instead
            of the same 6-column table needing horizontal scroll to read --
            piloting a responsive-breakpoint approach (one codebase, no
            separate app-only view) for KF1-X-11's "cramped on narrow
            screens" complaint, tried here first since this table already
            had a known concrete report. */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                <th className="pb-3 text-left w-8">Pos</th>
                <th className="pb-3 text-left w-10">Grid</th>
                <th className="pb-3 text-left">Driver</th>
                <th className="pb-3 text-left">Constructor</th>
                <th className="pb-3 text-right">Time / Gap</th>
                <th className="pb-3 text-right w-12">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {results.map((r) => {
                const gridDiff = r.grid && /^\d+$/.test(r.grid) ? Number(r.grid) - r.position : null;
                return (
                  <tr key={`${r.driverId}-${r.position}`} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="py-2.5 font-bold text-white w-8">{r.place}</td>
                    <td className="py-2.5 text-zinc-500 font-mono text-xs w-10">
                      {r.grid ?? "—"}
                      {gridDiff !== null && gridDiff > 0 && <span className="text-green-400 ml-1">▲{gridDiff}</span>}
                      {gridDiff !== null && gridDiff < 0 && <span className="text-red-400 ml-1">▼{Math.abs(gridDiff)}</span>}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5">
                        {r.nationalityCode && (
                          <span className={`fi fi-${r.nationalityCode.toLowerCase()} fis`} style={{ fontSize: "1rem" }} />
                        )}
                        <Link href={`/drivers/${r.driverId}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                          {r.driverName}
                        </Link>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <Link href={`/constructors/${r.constructorId}/`} className="text-zinc-400 text-xs hover:text-zinc-300 transition-colors">
                        {r.constructor}
                      </Link>
                    </td>
                    <td className="py-2.5 text-white text-right font-mono text-base font-bold">{r.time ?? "—"}</td>
                    <td className="py-2.5 text-right text-zinc-300">{Number(r.points) > 0 ? Number(r.points).toFixed(0) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-zinc-800/60">
          {results.map((r) => {
            const gridDiff = r.grid && /^\d+$/.test(r.grid) ? Number(r.grid) - r.position : null;
            return (
              <div
                key={`${r.driverId}-${r.position}-m`}
                className="grid grid-cols-[2.25rem_2.5rem_1.25rem_1fr_auto] gap-x-1.5 items-center py-2.5"
              >
                {/* Row 1: position, grid, flag, driver, time */}
                <span className={`font-bold text-white ${/^\d+$/.test(r.place) ? "text-sm" : "text-xs"}`}>
                  {r.place}
                </span>
                <span className="text-zinc-500 text-sm font-mono">{r.grid ?? "—"}</span>
                <span>
                  {r.nationalityCode && (
                    <span className={`fi fi-${r.nationalityCode.toLowerCase()} fis`} style={{ fontSize: "0.95rem" }} />
                  )}
                </span>
                <Link href={`/drivers/${r.driverId}/`} className="text-white font-medium text-sm hover:text-red-400 transition-colors truncate">
                  {r.driverName}
                </Link>
                <span className="text-white text-right font-mono text-sm font-bold">{r.time ?? "—"}</span>

                {/* Row 2: (blank under pos), grid delta, (blank under flag), team, points */}
                <span />
                <span className="text-xs font-mono">
                  {gridDiff !== null && gridDiff > 0 && <span className="text-green-400">▲{gridDiff}</span>}
                  {gridDiff !== null && gridDiff < 0 && <span className="text-red-400">▼{Math.abs(gridDiff)}</span>}
                </span>
                <span />
                <Link href={`/constructors/${r.constructorId}/`} className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors truncate">
                  {r.constructor}
                </Link>
                <span className="text-zinc-300 text-right text-xs">
                  {Number(r.points) > 0 ? `${Number(r.points).toFixed(0)} pts` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones, grouped under a heading per exact achievement */}
      {milestones.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-white mb-4">Milestones</h2>
          <div className="space-y-4 mb-12">
            {milestoneGroups.map((group) => (
              <div key={group.key}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                  <span className="text-2xl leading-none">{group.icon}</span> {group.heading}
                </h3>
                <div className="space-y-1.5 ml-8">
                  {group.entries.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/40 rounded-lg px-4 py-2.5 text-sm">
                      <Link href={`/drivers/${m.driverId}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                        {m.driverName}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sprint results */}
      {sprintResults.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-white mb-4">Sprint Result</h2>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                  <th className="pb-3 text-left w-8">Pos</th>
                  <th className="pb-3 text-left">Driver</th>
                  <th className="pb-3 text-left">Constructor</th>
                  <th className="pb-3 text-right">Time / Gap</th>
                  <th className="pb-3 text-right w-12">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {sprintResults.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="py-2.5 font-bold text-white w-8">{r.place}</td>
                    <td className="py-2.5 text-white font-medium">{r.driverName}</td>
                    <td className="py-2.5 text-zinc-400 text-xs">{r.constructor}</td>
                    <td className="py-2.5 text-white text-right font-mono text-base font-bold">{r.time ?? "—"}</td>
                    <td className="py-2.5 text-right text-zinc-300">{Number(r.points) > 0 ? Number(r.points).toFixed(0) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-zinc-800/60">
            {sprintResults.map((r, i) => (
              <div key={i} className="grid grid-cols-[2.25rem_1fr_auto] gap-x-1.5 items-center py-2.5">
                <span className={`font-bold text-white ${/^\d+$/.test(r.place) ? "text-sm" : "text-xs"}`}>
                  {r.place}
                </span>
                <span className="text-white font-medium text-sm truncate">{r.driverName}</span>
                <span className="text-white text-right font-mono text-sm font-bold">{r.time ?? "—"}</span>

                <span />
                <span className="text-zinc-500 text-xs truncate">{r.constructor}</span>
                <span className="text-zinc-300 text-right text-xs">
                  {Number(r.points) > 0 ? `${Number(r.points).toFixed(0)} pts` : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
