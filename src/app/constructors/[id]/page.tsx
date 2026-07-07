import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllConstructors, getConstructorById, getConstructorSeasons, getConstructorChain, getConstructorSeasonDrivers, getConstructorRanks, getConstructorSeasonChampInfo, getConstructorDriverWdcPositions } from "@/lib/queries";
import { getBuildConfig, getSeed } from "@/lib/build-config";
import ConstructorSeasonTable from "./ConstructorSeasonTable";

export async function generateStaticParams() {
  const cfg = getBuildConfig();
  const spec = cfg?.constructors;
  if (spec === "all") {
    const constructors = await getAllConstructors();
    return constructors.map((c) => ({ id: String(c.id) }));
  }
  if (Array.isArray(spec) && spec.length > 0) return spec.map((id) => ({ id: String(id) }));
  const seed = getSeed(".constructors_seed");
  if (seed) return [{ id: seed }];
  const constructors = await getAllConstructors();
  return constructors.map((c) => ({ id: String(c.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const constructor = await getConstructorById(Number(id));
  if (!constructor) return {};
  return { title: `${constructor.name} — KiwiF1` };
}

function yearLabel(start: number, end: number | "present") {
  if (end === "present") return start === new Date().getFullYear() ? String(start) : `${start}–present`;
  if (start === end) return String(start);
  return `${start}–${end}`;
}

export default async function ConstructorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [constructor, seasons, seasonDrivers, chain, ranks, champInfo, driverWdcRows] = await Promise.all([
    getConstructorById(Number(id)),
    getConstructorSeasons(Number(id)),
    getConstructorSeasonDrivers(Number(id)),
    getConstructorChain(Number(id)),
    getConstructorRanks(Number(id)),
    getConstructorSeasonChampInfo(Number(id)),
    getConstructorDriverWdcPositions(Number(id)),
  ]);

  const driverWdcPos: Record<string, number> = {};
  for (const row of driverWdcRows) {
    driverWdcPos[`${row.year}-${row.driverId}`] = row.wdcPos;
  }

  if (!constructor) notFound();

  // Compute effective year ranges — handles constructors with pre-chain historical entries
  let prevEnd: number | null = null;
  const chainWithYears = chain.map((row, i) => {
    const start = prevEnd !== null ? Math.max(Number(row.firstYear), prevEnd + 1) : Number(row.firstYear);
    const isLast = i === chain.length - 1;
    const end: number | "present" = isLast ? "present" : Number(row.lastYear);
    prevEnd = Number(row.lastYear);
    return { ...row, start, end };
  });

  const isCurrent = Boolean(constructor.current);

  const statBoxes = [
    { label: "Races", value: constructor.races, rank: ranks?.racesRank },
    { label: "Wins", value: constructor.wins, rank: Number(constructor.wins) > 0 ? ranks?.winsRank : undefined },
    { label: "Podiums", value: constructor.podiums, rank: Number(constructor.podiums) > 0 ? ranks?.podiumsRank : undefined },
    { label: "Points", value: Number(constructor.points).toFixed(0), rank: Number(constructor.points) > 0 ? ranks?.pointsRank : undefined },
    { label: "Poles", value: constructor.poles, rank: Number(constructor.poles) > 0 ? ranks?.polesRank : undefined },
    { label: "Fastest Laps", value: constructor.fastestLaps, rank: Number(constructor.fastestLaps) > 0 ? ranks?.fastestLapsRank : undefined },
    { label: "Drivers", value: constructor.drivers, rank: undefined },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link href="/constructors/" className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← All Constructors
      </Link>

      <div className="mt-6 mb-10">
        {constructor.nationality && (
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{constructor.nationality}</p>
        )}
        <h1 className="text-4xl font-bold text-white">{constructor.name}</h1>
        {constructor.founder && (
          <p className="text-zinc-500 text-sm mt-1">Founded by {constructor.founder}</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-3">
        {statBoxes.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center">
            <p className="text-white font-bold text-xl">{s.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
            {s.rank != null && (
              <p className={`text-xs mt-1 ${s.rank === 1 ? "text-yellow-400" : s.rank === 2 ? "text-zinc-300" : s.rank === 3 ? "text-amber-600" : "text-zinc-500"}`}>#{s.rank} all-time</p>
            )}
          </div>
        ))}
      </div>


      <div className="flex flex-col gap-1 text-sm mb-10">
        {constructor.firstRaceTitle && (
          <span><span className="text-zinc-600">First race:</span> <span className="text-zinc-300">{constructor.firstRaceTitle}</span></span>
        )}
        {constructor.lastRaceTitle && (
          <span><span className="text-zinc-600">{isCurrent ? "Latest race:" : "Last race:"}</span> <span className="text-zinc-300">{constructor.lastRaceTitle}</span></span>
        )}
      </div>

      {chainWithYears.length > 1 && (
        <div className="mb-12">
          <h2 className="text-lg font-bold text-white mb-4">Team History</h2>
          <div className="flex flex-col gap-0">
            {chainWithYears.map((row) => {
              const isCurrent = row.id === Number(id);
              return (
                <div key={row.id} className="flex items-center gap-4 py-2 border-b border-zinc-800/50 last:border-0">
                  <span className="text-zinc-500 text-sm font-mono w-28 shrink-0">
                    {yearLabel(row.start, row.end)}
                  </span>
                  {isCurrent ? (
                    <span className="text-white font-semibold text-sm">{row.displayName}</span>
                  ) : (
                    <Link
                      href={`/constructors/${row.id}/`}
                      className="text-zinc-300 hover:text-red-400 text-sm transition-colors"
                    >
                      {row.displayName}
                    </Link>
                  )}
                  {row.current && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium">Current</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold text-white mb-4">Season by Season</h2>
      <ConstructorSeasonTable seasons={seasons} driverRows={seasonDrivers} champInfo={champInfo} driverWdcPos={driverWdcPos} />
    </div>
  );
}
