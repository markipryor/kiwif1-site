import Link from "next/link";
import { getRecords } from "@/lib/queries";
import PointsTable from "./PointsTable";

export const metadata = { title: "All-Time Records — KiwiF1" };

function RecordTable({ rows, label }: { rows: { driverId: number; name: string; value: number }[]; label: string }) {
  const max = rows[0]?.value ?? 1;
  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">{label}</h2>
      <div className="space-y-2 mb-10">
        {rows.map((r, i) => (
          <div key={r.driverId} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4">
            <span className="text-zinc-500 text-sm w-5 text-right font-mono">{i + 1}</span>
            <div className="flex-1">
              <Link href={`/drivers/${r.driverId}/`} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">
                {r.name}
              </Link>
              <div className="w-full bg-zinc-800 rounded-full h-1 mt-2">
                <div className="h-1 rounded-full bg-red-500" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </div>
            <span className="text-white font-bold text-lg w-10 text-right">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function RecordsPage() {
  const { wins, podiums, poles, fastestLaps, points, races } = await getRecords();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">Formula 1</p>
      <h1 className="text-3xl font-bold text-white mb-10">All-Time Records</h1>

      <RecordTable rows={wins} label="Most Wins" />
      <RecordTable rows={podiums} label="Most Podiums" />
      <RecordTable rows={poles} label="Most Pole Positions" />
      <RecordTable rows={fastestLaps} label="Most Fastest Laps" />
      <PointsTable rows={points} />
      <RecordTable rows={races} label="Most Race Starts" />
    </div>
  );
}
