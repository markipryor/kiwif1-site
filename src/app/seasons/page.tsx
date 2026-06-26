import Link from "next/link";
import { getAllSeasons } from "@/lib/queries";

export const metadata = { title: "Seasons — KiwiF1" };

export default async function SeasonsPage() {
  const seasons = await getAllSeasons();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">Formula 1</p>
      <h1 className="text-3xl font-bold text-white mb-8">All Seasons</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left">Year</th>
              <th className="pb-3 text-right">Races</th>
              <th className="pb-3 text-right">Drivers</th>
              <th className="pb-3 text-left pl-6">Champion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {seasons.map((s) => (
              <tr key={s.year} className="hover:bg-zinc-900/60 transition-colors">
                <td className="py-2.5">
                  <Link href={`/seasons/${s.year}/`} className="text-white font-bold hover:text-red-400 transition-colors">
                    {s.year}
                  </Link>
                </td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{s.races}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{s.drivers}</td>
                <td className="py-2.5 pl-6">
                  {s.isComplete ? (
                    <span className="text-zinc-300">{s.winner ?? "—"}</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="text-zinc-300">{s.winner ?? "—"}</span>
                      <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-700/40 px-1.5 py-0.5 rounded-full leading-none">Leader</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
