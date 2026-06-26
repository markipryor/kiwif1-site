import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTeammatePairs, getCurrentTeammatePairs, getDriverById, getTeammateComparison } from "@/lib/queries";
import { getBuildConfig, getSeed } from "@/lib/build-config";

export async function generateStaticParams() {
  const cfg = getBuildConfig();
  const spec = cfg?.comparisons;
  if (spec === "all") {
    const pairs = await getAllTeammatePairs();
    return pairs.map((p) => ({ pair: `${p.driverAId}-vs-${p.driverBId}` }));
  }
  if (spec === "current-pairs") {
    const pairs = await getCurrentTeammatePairs();
    return pairs.map((p) => ({ pair: `${p.driverAId}-vs-${p.driverBId}` }));
  }
  const seed = getSeed(".comparisons_seed");
  if (seed) return [{ pair: seed }];
  const pairs = await getAllTeammatePairs();
  return pairs.map((p) => ({ pair: `${p.driverAId}-vs-${p.driverBId}` }));
}

export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params;
  const [aStr, bStr] = pair.split("-vs-");
  const [a, b] = await Promise.all([getDriverById(Number(aStr)), getDriverById(Number(bStr))]);
  if (!a || !b) return {};
  return { title: `${a.firstName} ${a.surname} vs ${b.firstName} ${b.surname} — KiwiF1` };
}

export default async function ComparisonPage({ params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params;
  const [aStr, bStr] = pair.split("-vs-");
  const driverAId = Number(aStr);
  const driverBId = Number(bStr);

  const [driverA, driverB, seasons] = await Promise.all([
    getDriverById(driverAId),
    getDriverById(driverBId),
    getTeammateComparison(driverAId, driverBId),
  ]);

  if (!driverA || !driverB || seasons.length === 0) notFound();

  const totals = seasons.reduce(
    (acc, s) => ({
      aWins: acc.aWins + Number(s.aWins),
      aPodiums: acc.aPodiums + Number(s.aPodiums),
      aPoints: acc.aPoints + Number(s.aPoints),
      aQualiAhead: acc.aQualiAhead + Number(s.aQualiAhead),
      bWins: acc.bWins + Number(s.bWins),
      bPodiums: acc.bPodiums + Number(s.bPodiums),
      bPoints: acc.bPoints + Number(s.bPoints),
      bQualiAhead: acc.bQualiAhead + Number(s.bQualiAhead),
    }),
    { aWins: 0, aPodiums: 0, aPoints: 0, aQualiAhead: 0, bWins: 0, bPodiums: 0, bPoints: 0, bQualiAhead: 0 }
  );

  const nameA = `${driverA.firstName} ${driverA.surname}`;
  const nameB = `${driverB.firstName} ${driverB.surname}`;

  function Bar({ a, b }: { a: number; b: number }) {
    const total = a + b || 1;
    const pctA = (a / total) * 100;
    return (
      <div className="flex items-center gap-2 w-full">
        <span className="text-white font-bold text-sm w-8 text-right">{a}</span>
        <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-zinc-800">
          <div className="bg-blue-500 h-full" style={{ width: `${pctA}%` }} />
          <div className="bg-red-500 h-full flex-1" />
        </div>
        <span className="text-white font-bold text-sm w-8">{b}</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">Teammate Comparison</p>
        <h1 className="text-3xl font-bold text-white">
          <Link href={`/drivers/${driverAId}/`} className="hover:text-blue-400 transition-colors">{nameA}</Link>
          <span className="text-zinc-500 mx-3">vs</span>
          <Link href={`/drivers/${driverBId}/`} className="hover:text-red-400 transition-colors">{nameB}</Link>
        </h1>
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-xs mb-8">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />{nameA}</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />{nameB}</span>
      </div>

      {/* Overall totals */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">Overall (as teammates)</h2>
        {[
          { label: "Wins", a: totals.aWins, b: totals.bWins },
          { label: "Podiums", a: totals.aPodiums, b: totals.bPodiums },
          { label: "Points", a: Math.round(totals.aPoints), b: Math.round(totals.bPoints) },
          { label: "Qualifying", a: totals.aQualiAhead, b: totals.bQualiAhead },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-4">
            <span className="text-zinc-500 text-xs w-16">{row.label}</span>
            <Bar a={row.a} b={row.b} />
          </div>
        ))}
      </div>

      {/* Season by season */}
      <h2 className="text-lg font-bold text-white mb-4">Season by Season</h2>
      <div className="space-y-4">
        {seasons.map((s) => (
          <div key={`${s.year}-${s.constructorId}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <Link href={`/seasons/${s.year}/`} className="text-white font-bold hover:text-red-400 transition-colors">{s.year}</Link>
              <Link href={`/constructors/${s.constructorId}/`} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">{s.constructor}</Link>
            </div>
            <div className="space-y-3">
              {[
                { label: "Wins", a: Number(s.aWins), b: Number(s.bWins) },
                { label: "Podiums", a: Number(s.aPodiums), b: Number(s.bPodiums) },
                { label: "Points", a: Math.round(Number(s.aPoints)), b: Math.round(Number(s.bPoints)) },
                { label: "Qualifying", a: Number(s.aQualiAhead), b: Number(s.bQualiAhead) },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-4">
                  <span className="text-zinc-500 text-xs w-16">{row.label}</span>
                  <Bar a={row.a} b={row.b} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
