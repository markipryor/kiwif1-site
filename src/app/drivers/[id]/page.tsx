import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDrivers, getDriverById, getDriverSeasons, getDriverTeammates, getDriverChampionships } from "@/lib/queries";

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
  const [driver, seasons, teammates, championships] = await Promise.all([
    getDriverById(Number(id)),
    getDriverSeasons(Number(id)),
    getDriverTeammates(Number(id)),
    getDriverChampionships(Number(id)),
  ]);

  if (!driver) notFound();

  const stats = [
    ...(championships > 0 ? [{ label: "Championships", value: `${"★".repeat(championships)} ${championships}` }] : []),
    { label: "Races", value: driver.races },
    { label: "Wins", value: driver.wins },
    { label: "Podiums", value: driver.podiums },
    { label: "Poles", value: driver.poles },
    { label: "Fastest Laps", value: driver.fastestLaps },
    { label: "Points", value: Number(driver.points).toFixed(0) },
    { label: "Seasons", value: driver.seasons },
    { label: "First race", value: driver.firstRace },
    { label: "Last race", value: driver.lastRace },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link href="/drivers/" className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← All Drivers
      </Link>

      <div className="mt-6 mb-10">
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{driver.nationality}</p>
        <h1 className="text-4xl font-bold text-white">
          {driver.firstName} {driver.surname}
        </h1>
        {driver.dateOfBirth && (
          <p className="text-zinc-500 text-sm mt-1">
            b. {new Date(driver.dateOfBirth).toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" })}
            {driver.dateOfDeath && ` — d. ${new Date(driver.dateOfDeath).toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" })}`}
          </p>
        )}
      </div>

      {/* Career stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-12">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center">
            <p className="text-white font-bold text-xl">{s.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Season breakdown */}
      <h2 className="text-lg font-bold text-white mb-4">Season by Season</h2>
      <div className="overflow-x-auto mb-12">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left">Year</th>
              <th className="pb-3 text-left">Constructor</th>
              <th className="pb-3 text-right">Races</th>
              <th className="pb-3 text-right">Wins</th>
              <th className="pb-3 text-right">Podiums</th>
              <th className="pb-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {seasons.map((s) => (
              <tr key={`${s.year}-${s.constructorId}`} className="hover:bg-zinc-900/60 transition-colors">
                <td className="py-2.5">
                  <Link href={`/seasons/${s.year}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                    {s.year}
                  </Link>
                </td>
                <td className="py-2.5">
                  <Link href={`/constructors/${s.constructorId}/`} className="text-zinc-400 hover:text-white transition-colors">
                    {s.constructor}
                  </Link>
                </td>
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
