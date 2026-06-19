import Link from "next/link";
import { getAllConstructors } from "@/lib/queries";

export const metadata = { title: "Constructors — KiwiF1" };

export default async function ConstructorsPage() {
  const constructors = await getAllConstructors();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">Formula 1</p>
      <h1 className="text-3xl font-bold text-white mb-8">All Constructors</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left">Constructor</th>
              <th className="pb-3 text-left">Nationality</th>
              <th className="pb-3 text-right">First</th>
              <th className="pb-3 text-right">Last</th>
              <th className="pb-3 text-right">Races</th>
              <th className="pb-3 text-right">Wins</th>
              <th className="pb-3 text-right">Podiums</th>
              <th className="pb-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {constructors.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-900/60 transition-colors">
                <td className="py-2.5">
                  <Link href={`/constructors/${c.id}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                    {c.name}
                  </Link>
                  {c.current ? <span className="ml-2 text-xs bg-green-900/50 text-green-400 border border-green-700/40 px-1.5 py-0.5 rounded">Current</span> : null}
                </td>
                <td className="py-2.5 text-zinc-400">{c.nationality ?? "—"}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{c.firstSeason}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{c.lastSeason}</td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{c.races}</td>
                <td className="py-2.5 text-right font-mono">
                  <span className={Number(c.wins) > 0 ? "text-white font-semibold" : "text-zinc-500"}>{c.wins}</span>
                </td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{c.podiums}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{Number(c.points).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
