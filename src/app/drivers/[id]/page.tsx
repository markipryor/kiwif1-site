import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDrivers, getDriverById, getDriverSeasons, getDriverTeammates, getDriverChampionships, getDriverSeasonPositions } from "@/lib/queries";

export async function generateStaticParams() {
  const drivers = await getAllDrivers();
  return drivers.map((d) => ({ id: String(d.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await getDriverById(Number(id));
  if (!driver) return {};
  return { title: `${driver.firstName} ${driver.surname} — KiwiF1` };
}

export default async function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [driver, seasons, teammates, championships, seasonPositions] = await Promise.all([
    getDriverById(Number(id)),
    getDriverSeasons(Number(id)),
    getDriverTeammates(Number(id)),
    getDriverChampionships(Number(id)),
    getDriverSeasonPositions(Number(id)),
  ]);
  const posMap = new Map(seasonPositions.map((p) => [p.year, p.champPos]));

  if (!driver) notFound();

  const stats = [
    { label: "Races", value: driver.races },
    { label: "Wins", value: driver.wins },
    { label: "Podiums", value: driver.podiums },
    { label: "Poles", value: driver.poles },
    { label: "Fastest Laps", value: driver.fastestLaps },
    { label: "Points", value: Number(driver.points).toFixed(0) },
    { label: "Seasons", value: driver.seasons },
  ];

  const champStars = championships > 4
    ? <span className="inline-flex flex-col items-center leading-tight"><span>{"★".repeat(Math.ceil(championships / 2))}</span><span>{"★".repeat(Math.floor(championships / 2))}</span></span>
    : <span>{"★".repeat(championships)}</span>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link href="/drivers/" className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← All Drivers
      </Link>

      <div className="mt-6 mb-10">
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
          {driver.nationalityCode && (
            <span className={`fi fi-${driver.nationalityCode.toLowerCase()} fis`} title={driver.nationality} style={{ fontSize: "1rem" }} />
          )}
          {driver.nationality}
        </p>
        <h1 className="text-4xl font-bold text-white flex items-center gap-3 flex-wrap">
          {driver.firstName} {driver.surname}
          {Boolean(driver.current) && (
            <span className="text-sm bg-green-900/50 text-green-400 border border-green-700/40 px-2 py-1 rounded">Current</span>
          )}
          {Boolean(driver.indyOnly) && (
            <span className="text-sm bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-1 rounded">Indy 500 only</span>
          )}
        </h1>
        {driver.dateOfBirth && (
          <p className="text-zinc-500 text-sm mt-1">
            b. {new Date(driver.dateOfBirth).toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" })}
            {driver.dateOfDeath && driver.dateOfDeath !== "0000-00-00" && ` — d. ${new Date(driver.dateOfDeath).toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" })}`}
          </p>
        )}
      </div>

      {/* Career stats */}
      {championships > 0 && (
        <div className="mb-4 bg-amber-900/20 border border-amber-700/30 rounded-xl px-6 py-4 text-center">
          <div className="text-amber-400 text-2xl leading-tight">{champStars}</div>
          <p className="text-amber-500/70 text-xs mt-1">{championships}× World Champion</p>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center">
            <p className="text-white font-bold text-xl">{s.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-zinc-500 mb-12">
        {driver.firstRaceTitle && (
          <span><span className="text-zinc-600">First race:</span> {driver.firstRaceTitle} ({driver.firstRace})</span>
        )}
        {driver.lastRaceTitle && (
          <span><span className="text-zinc-600">{Boolean(driver.current) ? "Latest race:" : "Last race:"}</span> {driver.lastRaceTitle} ({driver.lastRace})</span>
        )}
      </div>

      {/* Season breakdown */}
      <h2 className="text-lg font-bold text-white mb-4">Season by Season</h2>
      <div className="overflow-x-auto mb-12">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left">Year</th>
              <th className="pb-3 text-right">Pos</th>
              <th className="pb-3 text-left pl-4">Constructor</th>
              <th className="pb-3 text-left pl-4">Teammate(s)</th>
              <th className="pb-3 text-right">Races</th>
              <th className="pb-3 text-right">Wins</th>
              <th className="pb-3 text-right">Podiums</th>
              <th className="pb-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {seasons.map((s) => {
              const pos = posMap.get(s.year);
              return (
              <tr key={`${s.year}-${s.constructorId}`} className="hover:bg-zinc-900/60 transition-colors">
                <td className="py-2.5">
                  <Link href={`/seasons/${s.year}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                    {s.year}
                  </Link>
                </td>
                <td className="py-2.5 text-right font-mono">
                  {pos != null ? (
                    <span className={pos === 1 ? "text-yellow-400 font-bold" : "text-zinc-400"}>P{pos}</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="py-2.5 pl-4">
                  <Link href={`/constructors/${s.constructorId}/`} className="text-zinc-400 hover:text-white transition-colors">
                    {s.constructor}
                  </Link>
                </td>
                <td className="py-2.5 pl-4 text-zinc-500 text-sm">{s.teammates ?? "—"}</td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{s.races}</td>
                <td className="py-2.5 text-right font-mono">
                  <span className={Number(s.wins) > 0 ? "text-white font-semibold" : "text-zinc-500"}>{s.wins}</span>
                </td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{s.podiums}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{Number(s.points).toFixed(0)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Teammates */}
      {teammates.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-white mb-4">Teammates</h2>
          <div className="flex flex-wrap gap-2">
            {teammates.map((t) => {
              const pairA = Math.min(Number(id), t.id);
              const pairB = Math.max(Number(id), t.id);
              return (
                <Link
                  key={t.id}
                  href={`/comparisons/${pairA}-vs-${pairB}/`}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  vs {t.firstName} {t.surname}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
