import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllConstructors, getConstructorById, getConstructorSeasons, getConstructorChain } from "@/lib/queries";
import { getBuildConfig, getSeed } from "@/lib/build-config";

export async function generateStaticParams() {
  const cfg = getBuildConfig();
  const spec = cfg?.constructors;
  if (spec === "all") {
    const constructors = await getAllConstructors();
    return constructors.map((c) => ({ id: String(c.id) }));
  }
  if (Array.isArray(spec)) return spec.map((id) => ({ id: String(id) }));
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
  const [constructor, seasons, chain] = await Promise.all([
    getConstructorById(Number(id)),
    getConstructorSeasons(Number(id)),
    getConstructorChain(Number(id)),
  ]);

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

  const stats = [
    { label: "Races", value: constructor.races },
    { label: "Wins", value: constructor.wins },
    { label: "Podiums", value: constructor.podiums },
    { label: "Points", value: Number(constructor.points).toFixed(0) },
    { label: "Drivers", value: constructor.drivers },
    { label: "First season", value: constructor.firstSeason },
    { label: "Last season", value: constructor.lastSeason },
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-12">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center">
            <p className="text-white font-bold text-xl">{s.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left">Year</th>
              <th className="pb-3 text-left">Drivers</th>
              <th className="pb-3 text-right">Races</th>
              <th className="pb-3 text-right">Wins</th>
              <th className="pb-3 text-right">Podiums</th>
              <th className="pb-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {seasons.map((s) => (
              <tr key={s.year} className="hover:bg-zinc-900/60 transition-colors">
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/seasons/${s.year}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                      {s.year}
                    </Link>
                    {!s.isComplete && (
                      <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-700/40 px-1.5 py-0.5 rounded-full leading-none">In Progress</span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 text-zinc-400 text-sm">{s.drivers}</td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{s.races}</td>
                <td className="py-2.5 text-right font-mono">
                  <span className={Number(s.wins) > 0 ? "text-white font-semibold" : "text-zinc-500"}>{s.wins}</span>
                </td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{s.podiums}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{Number(s.points).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
