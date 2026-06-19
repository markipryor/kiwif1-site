import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllSeasons, getSeasonRaces, getSeasonRaceWinners,
  getSeasonDriverStandings, getSeasonConstructorStandings,
} from "@/lib/queries";

export async function generateStaticParams() {
  const seasons = await getAllSeasons();
  return seasons.map((s) => ({ year: String(s.year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return { title: `${year} Season — KiwiF1` };
}

export default async function SeasonPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const y = Number(year);

  const [races, winners, driverStandings, constructorStandings] = await Promise.all([
    getSeasonRaces(y),
    getSeasonRaceWinners(y),
    getSeasonDriverStandings(y),
    getSeasonConstructorStandings(y),
  ]);

  if (races.length === 0) notFound();

  const winnerMap = new Map(winners.map((w) => [w.raceId, w]));
  const maxDriverPoints = driverStandings[0]?.points ?? 1;
  const maxConstructorPoints = constructorStandings[0]?.points ?? 1;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link href="/seasons/" className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← All Seasons
      </Link>

      <div className="mt-6 mb-10">
        <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-1">Season</p>
        <h1 className="text-4xl font-bold text-white">{year} Formula 1 World Championship</h1>
      </div>

      {/* Driver standings */}
      <h2 className="text-lg font-bold text-white mb-4">Driver Standings</h2>
      <div className="space-y-2 mb-12">
        {driverStandings.map((d) => (
          <div key={`${d.driverId}-${d.constructorId}`} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4">
            <span className="text-zinc-500 text-sm w-6 text-right font-mono">{d.pos}</span>
            <div className="flex-1 min-w-0">
              <Link href={`/drivers/${d.driverId}/`} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">
                {d.name}
              </Link>
              <p className="text-zinc-500 text-xs">
                <Link href={`/constructors/${d.constructorId}/`} className="hover:text-zinc-300 transition-colors">
                  {d.constructor}
                </Link>
              </p>
            </div>
            <div className="hidden sm:flex gap-5 text-xs text-zinc-400 text-right">
              <div><p className="text-white font-medium">{d.wins}</p><p>Wins</p></div>
              <div><p className="text-white font-medium">{d.podiums}</p><p>Podiums</p></div>
            </div>
            <div className="text-right min-w-[60px]">
              <p className="text-white font-bold text-lg">{Number(d.points).toFixed(0)}</p>
              <div className="w-full bg-zinc-800 rounded-full h-1 mt-1">
                <div className="h-1 rounded-full bg-red-500" style={{ width: `${(Number(d.points) / Number(maxDriverPoints)) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Constructor standings */}
      {constructorStandings.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-white mb-4">Constructor Standings</h2>
          <div className="space-y-2 mb-12">
            {constructorStandings.map((c) => (
              <div key={c.constructorId} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4">
                <span className="text-zinc-500 text-sm w-6 text-right font-mono">{c.pos}</span>
                <div className="flex-1">
                  <Link href={`/constructors/${c.constructorId}/`} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">
                    {c.name}
                  </Link>
                  <p className="text-zinc-500 text-xs">{c.wins} win{c.wins !== 1 ? "s" : ""}</p>
                </div>
                <div className="text-right min-w-[60px]">
                  <p className="text-white font-bold text-lg">{Number(c.points).toFixed(0)}</p>
                  <div className="w-full bg-zinc-800 rounded-full h-1 mt-1">
                    <div className="h-1 rounded-full bg-orange-500" style={{ width: `${(Number(c.points) / Number(maxConstructorPoints)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Race calendar */}
      <h2 className="text-lg font-bold text-white mb-4">Race Calendar</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left w-8">#</th>
              <th className="pb-3 text-left">Grand Prix</th>
              <th className="pb-3 text-left">Date</th>
              <th className="pb-3 text-left">Winner</th>
              <th className="pb-3 text-left">Constructor</th>
              <th className="pb-3 text-center w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {races.map((r, i) => {
              const winner = winnerMap.get(r.id);
              return (
                <tr key={r.id} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="py-2.5 text-zinc-500 font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5">
                    <Link href={`/races/${r.id}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                      {r.shortTitle}
                    </Link>
                  </td>
                  <td className="py-2.5 text-zinc-400">
                    {new Date(r.date).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                  </td>
                  <td className="py-2.5">
                    {winner ? (
                      <Link href={`/drivers/${winner.driverId}/`} className="text-zinc-300 hover:text-white transition-colors">
                        {winner.driverName}
                      </Link>
                    ) : (
                      <span className="text-zinc-600 italic">Pending</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {winner ? (
                      <Link href={`/constructors/${winner.constructorId}/`} className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
                        {winner.constructor}
                      </Link>
                    ) : null}
                  </td>
                  <td className="py-2.5 text-center">
                    {r.sprint ? <span className="text-xs bg-purple-900/50 text-purple-300 border border-purple-700/40 px-2 py-0.5 rounded-full">Sprint</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
