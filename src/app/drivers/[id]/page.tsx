import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDrivers, getDriverById, getDriverSeasons, getDriverTeammates, getDriverChampionships, getDriverSeasonPositions, getDriverRanks, getDriverRaceResults, getDriverSeasonCumulative } from "@/lib/queries";
import { getBuildConfig, getSeed } from "@/lib/build-config";
import DriverSeasonTable from "./DriverSeasonTable";

export async function generateStaticParams() {
  const cfg = getBuildConfig();
  const spec = cfg?.drivers;
  if (spec === "all" || !cfg) {
    const all = await getAllDrivers();
    return all.map((d) => ({ id: String(d.id) }));
  }
  if (Array.isArray(spec) && spec.length > 0) return spec.map((id) => ({ id: String(id) }));
  const seed = getSeed(".drivers_seed");
  if (seed) return [{ id: seed }];
  const all = await getAllDrivers();
  return all.map((d) => ({ id: String(d.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await getDriverById(Number(id));
  if (!driver) return {};
  return { title: `${driver.firstName} ${driver.surname} — KiwiF1` };
}

export default async function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [driver, seasons, teammates, championships, seasonPositions, ranks, raceResults, seasonCumulative] = await Promise.all([
    getDriverById(Number(id)),
    getDriverSeasons(Number(id)),
    getDriverTeammates(Number(id)),
    getDriverChampionships(Number(id)),
    getDriverSeasonPositions(Number(id)),
    getDriverRanks(Number(id)),
    getDriverRaceResults(Number(id)),
    getDriverSeasonCumulative(Number(id)),
  ]);

  if (!driver) notFound();

  const stats = [
    { label: "Races",        value: driver.races,                       rank: ranks.racesRank,                                          recordSlug: "race-starts" },
    { label: "Wins",         value: driver.wins,                        rank: Number(driver.wins) > 0 ? ranks.winsRank : null,          recordSlug: "wins" },
    { label: "Podiums",      value: driver.podiums,                     rank: Number(driver.podiums) > 0 ? ranks.podiumsRank : null,    recordSlug: "podiums" },
    { label: "Poles",        value: driver.poles,                       rank: Number(driver.poles) > 0 ? ranks.polesRank : null,        recordSlug: "poles" },
    { label: "Fastest Laps", value: driver.fastestLaps,                 rank: Number(driver.fastestLaps) > 0 ? ranks.fastestLapsRank : null, recordSlug: "fastest-laps" },
    { label: "Points",       value: Number(driver.points).toFixed(0),   rank: Number(driver.points) > 0 ? ranks.pointsRank : null,     recordSlug: "points" },
    { label: "Seasons",      value: driver.seasons },
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
            {"rank" in s && s.rank != null && "recordSlug" in s && s.recordSlug ? (
              <Link href={`/records/${s.recordSlug}/`} className={`text-xs mt-0.5 block hover:underline ${s.rank === 1 ? "text-yellow-400" : s.rank === 2 ? "text-zinc-300" : s.rank === 3 ? "text-amber-600" : "text-zinc-500"}`}>#{s.rank} all-time</Link>
            ) : "rank" in s && s.rank != null ? (
              <p className={`text-xs mt-0.5 ${s.rank === 1 ? "text-yellow-400" : s.rank === 2 ? "text-zinc-300" : s.rank === 3 ? "text-amber-600" : "text-zinc-500"}`}>#{s.rank} all-time</p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 text-sm text-zinc-500 mb-12">
        {driver.firstRaceTitle && (
          <span>
            <span className="text-zinc-600">First race:</span>{" "}
            {driver.firstRaceTitle}
            {!driver.firstRaceTitle.includes(String(driver.firstRace)) && ` (${driver.firstRace})`}
          </span>
        )}
        {driver.lastRaceTitle && (
          <span>
            <span className="text-zinc-600">{Boolean(driver.current) ? "Latest race:" : "Last race:"}</span>{" "}
            {driver.lastRaceTitle}
            {!driver.lastRaceTitle.includes(String(driver.lastRace)) && ` (${driver.lastRace})`}
          </span>
        )}
      </div>

      {/* Head to Head */}
      {teammates.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-white mb-4">Head to Head</h2>
          <Link
            href={`/comparisons/${id}/`}
            className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors mb-12"
          >
            vs {teammates.length} teammate{teammates.length !== 1 ? "s" : ""} →
          </Link>
        </>
      )}

      {/* Season breakdown */}
      <h2 className="text-lg font-bold text-white mb-4">Season by Season</h2>
      <DriverSeasonTable
        seasons={seasons}
        raceResults={raceResults}
        seasonPositions={seasonPositions}
        seasonCumulative={seasonCumulative}
      />
    </div>
  );
}
