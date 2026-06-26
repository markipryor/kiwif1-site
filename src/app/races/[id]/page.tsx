import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSeasons, getSeasonRaces, getRaceById, getRaceResults, getRacePole, getRaceFastestLap, getRaceSprintResults } from "@/lib/queries";
import { getBuildConfig, getSeed } from "@/lib/build-config";

export async function generateStaticParams() {
  const cfg = getBuildConfig();
  const spec = cfg?.races;
  if (spec === "all") {
    const seasons = await getAllSeasons();
    const allRaces = await Promise.all(seasons.map((s) => getSeasonRaces(s.year)));
    return allRaces.flat().map((r) => ({ id: String(r.id) }));
  }
  if (Array.isArray(spec)) return spec.map((id) => ({ id: String(id) }));
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
  const [race, results, pole, fastestLap, sprintResults] = await Promise.all([
    getRaceById(Number(id)),
    getRaceResults(Number(id)),
    getRacePole(Number(id)),
    getRaceFastestLap(Number(id)),
    getRaceSprintResults(Number(id)),
  ]);

  if (!race) notFound();

  const year = new Date(race.date).getFullYear();
  const winner = results.find((r) => r.place === "1");

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link href={`/seasons/${year}/`} className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← {year} Season
      </Link>

      <div className="mt-6 mb-6">
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
          {new Date(race.date).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })} · {race.circuitCity}
        </p>
        <h1 className="text-4xl font-bold text-white">{race.fullTitle ?? `${year} ${race.shortTitle} Grand Prix`}</h1>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-zinc-400 mb-8">
        <span>🏁 {race.laps} laps</span>
        {pole && <span>🔵 Pole: <span className="text-white">{pole.time}</span></span>}
        {fastestLap && (
          <span>⚡ Fastest lap: <span className="text-white">{fastestLap.driverName}</span> {fastestLap.time} (lap {fastestLap.lap})</span>
        )}
        {race.sprint ? <span className="text-purple-400">⚡ Sprint weekend</span> : null}
      </div>

      {/* Race results */}
      <h2 className="text-lg font-bold text-white mb-4">Race Result</h2>
      <div className="overflow-x-auto mb-12">
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
                    <Link href={`/drivers/${r.driverId}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                      {r.driverName}
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <Link href={`/constructors/${r.constructorId}/`} className="text-zinc-400 text-xs hover:text-zinc-300 transition-colors">
                      {r.constructor}
                    </Link>
                  </td>
                  <td className="py-2.5 text-zinc-300 text-right font-mono text-xs">{r.time ?? "—"}</td>
                  <td className="py-2.5 text-right font-bold text-white">{Number(r.points) > 0 ? Number(r.points).toFixed(0) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sprint results */}
      {sprintResults.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-white mb-4">Sprint Result</h2>
          <div className="overflow-x-auto">
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
                    <td className="py-2.5 text-zinc-300 text-right font-mono text-xs">{r.time ?? "—"}</td>
                    <td className="py-2.5 text-right font-bold text-white">{Number(r.points) > 0 ? Number(r.points).toFixed(0) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
