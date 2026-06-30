import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDrivers, getDriverById, getDriverComparisons, getDriverTeammates } from "@/lib/queries";
import { getBuildConfig, getSeed } from "@/lib/build-config";

type CompRow = {
  teammateId: number;
  teammateName: string;
  year: number;
  constructorId: number;
  constructorName: string;
  sharedRaces: number;
  qualiRaces: number;
  aQualiAhead: number;
  finishRaces: number;
  aFinishAhead: number;
  aPoints: number;
  bPoints: number;
};

function pct(num: number, den: number): string {
  if (den === 0) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

function Fraction({ num, den, highlight }: { num: number; den: number; highlight: boolean }) {
  if (den === 0) return <span className="text-zinc-600">—</span>;
  return (
    <span className={highlight ? "text-white" : "text-zinc-400"}>
      {num} - {den - num}
    </span>
  );
}

export async function generateStaticParams() {
  const cfg = getBuildConfig();
  const spec = cfg?.comparisons;
  if (spec === "all" || !cfg) {
    const all = await getAllDrivers();
    return all.map((d) => ({ id: String(d.id) }));
  }
  const seed = getSeed(".comparisons_seed");
  if (seed) return [{ id: seed }];
  const all = await getAllDrivers();
  return all.map((d) => ({ id: String(d.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await getDriverById(Number(id));
  if (!driver) return {};
  return { title: `${driver.firstName} ${driver.surname} Head to Head — KiwiF1` };
}

export default async function DriverComparisonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driverId = Number(id);

  const [driver, comparisons] = await Promise.all([
    getDriverById(driverId),
    getDriverComparisons(driverId),
  ]);

  if (!driver) notFound();

  const driverName = `${driver.firstName} ${driver.surname}`;

  const totals = comparisons.reduce(
    (acc, r) => ({
      sharedRaces: acc.sharedRaces + Number(r.sharedRaces),
      qualiRaces: acc.qualiRaces + Number(r.qualiRaces),
      aQualiAhead: acc.aQualiAhead + Number(r.aQualiAhead),
      finishRaces: acc.finishRaces + Number(r.finishRaces),
      aFinishAhead: acc.aFinishAhead + Number(r.aFinishAhead),
    }),
    { sharedRaces: 0, qualiRaces: 0, aQualiAhead: 0, finishRaces: 0, aFinishAhead: 0 }
  );

  // Group by teammate; insertion order = reverse-chronological (query orders by year DESC)
  const teammateMap = new Map<number, { name: string; rows: CompRow[] }>();
  const teammateOrder: number[] = [];
  for (const row of comparisons) {
    if (!teammateMap.has(row.teammateId)) {
      teammateOrder.push(row.teammateId);
      teammateMap.set(row.teammateId, { name: row.teammateName, rows: [] });
    }
    teammateMap.get(row.teammateId)!.rows.push(row);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link href={`/drivers/${driverId}/`} className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← {driverName}
      </Link>

      <div className="mt-6 mb-10">
        <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">Head to Head</p>
        <h1 className="text-3xl font-bold text-white">{driverName}</h1>
        <p className="text-zinc-500 text-sm mt-1">vs teammates</p>
      </div>

      {comparisons.length === 0 ? (
        <p className="text-zinc-500">No shared races with teammates found.</p>
      ) : (
        <>
          {/* Summary boxes */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center">
              <p className="text-white font-bold text-xl">{totals.sharedRaces}</p>
              <p className="text-zinc-500 text-xs mt-0.5">Shared Races</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center">
              <p className="text-white font-bold text-xl">{totals.aQualiAhead} - {totals.qualiRaces - totals.aQualiAhead}</p>
              <p className="text-zinc-500 text-xs mt-0.5">Qualified Ahead</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center">
              <p className="text-white font-bold text-xl">{totals.aFinishAhead} - {totals.finishRaces - totals.aFinishAhead}</p>
              <p className="text-zinc-500 text-xs mt-0.5">Finished Ahead</p>
            </div>
          </div>

          {/* Per-teammate sections */}
          <div className="space-y-10">
            {teammateOrder.map((tid) => {
              const { name, rows } = teammateMap.get(tid)!;
              const tm = rows.reduce(
                (acc, r) => ({
                  sharedRaces: acc.sharedRaces + Number(r.sharedRaces),
                  qualiRaces: acc.qualiRaces + Number(r.qualiRaces),
                  aQualiAhead: acc.aQualiAhead + Number(r.aQualiAhead),
                  finishRaces: acc.finishRaces + Number(r.finishRaces),
                  aFinishAhead: acc.aFinishAhead + Number(r.aFinishAhead),
                  aPoints: acc.aPoints + Number(r.aPoints),
                  bPoints: acc.bPoints + Number(r.bPoints),
                }),
                { sharedRaces: 0, qualiRaces: 0, aQualiAhead: 0, finishRaces: 0, aFinishAhead: 0, aPoints: 0, bPoints: 0 }
              );

              return (
                <div key={tid}>
                  <div className="flex items-baseline gap-3 mb-3">
                    <h2 className="text-lg font-bold text-white">
                      <Link href={`/drivers/${tid}/`} className="hover:text-red-400 transition-colors">{name}</Link>
                    </h2>
                    <span className="text-zinc-600 text-xs">
                      {tm.sharedRaces} race{tm.sharedRaces !== 1 ? "s" : ""} together
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                          <th className="pb-2 text-left">Year</th>
                          <th className="pb-2 text-left pl-4">Constructor</th>
                          <th className="pb-2 text-right">Races</th>
                          <th className="pb-2 text-right">Qualifying</th>
                          <th className="pb-2 text-right">Race Finish</th>
                          <th className="pb-2 text-right">Pts (me — tm)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {rows.map((r) => (
                          <tr key={`${r.year}-${r.constructorId}`} className="hover:bg-zinc-900/60 transition-colors">
                            <td className="py-2">
                              <Link href={`/seasons/${r.year}/`} className="text-white font-medium hover:text-red-400 transition-colors">{r.year}</Link>
                            </td>
                            <td className="py-2 pl-4">
                              <Link href={`/constructors/${r.constructorId}/`} className="text-zinc-400 hover:text-white transition-colors">{r.constructorName}</Link>
                            </td>
                            <td className="py-2 text-right font-mono text-zinc-300">{r.sharedRaces}</td>
                            <td className="py-2 text-right font-mono">
                              <Fraction num={Number(r.aQualiAhead)} den={Number(r.qualiRaces)} highlight={Number(r.aQualiAhead) > Number(r.qualiRaces) / 2} />
                            </td>
                            <td className="py-2 text-right font-mono">
                              <Fraction num={Number(r.aFinishAhead)} den={Number(r.finishRaces)} highlight={Number(r.aFinishAhead) > Number(r.finishRaces) / 2} />
                            </td>
                            <td className="py-2 text-right font-mono text-zinc-400">
                              {Number(r.aPoints).toFixed(0)} — {Number(r.bPoints).toFixed(0)}
                            </td>
                          </tr>
                        ))}
                        {rows.length > 1 && (
                          <tr className="border-t border-zinc-700">
                            <td className="pt-2 pb-1 text-zinc-600 text-xs italic" colSpan={2}>Total</td>
                            <td className="pt-2 pb-1 text-right font-mono text-xs text-zinc-500">{tm.sharedRaces}</td>
                            <td className="pt-2 pb-1 text-right font-mono text-xs">
                              <Fraction num={tm.aQualiAhead} den={tm.qualiRaces} highlight={tm.aQualiAhead > tm.qualiRaces / 2} />
                            </td>
                            <td className="pt-2 pb-1 text-right font-mono text-xs">
                              <Fraction num={tm.aFinishAhead} den={tm.finishRaces} highlight={tm.aFinishAhead > tm.finishRaces / 2} />
                            </td>
                            <td className="pt-2 pb-1 text-right font-mono text-xs text-zinc-400">
                              {tm.aPoints.toFixed(0)} — {tm.bPoints.toFixed(0)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
