"use client";

import { useState } from "react";
import Link from "next/link";

type Row = { driverId: number; name: string; value: number | string; pts2026: number | string };
type SortCol = "name" | "value" | "pts2026";
type SortDir = "asc" | "desc";

function fmt(n: number | string) {
  const v = parseFloat(Number(n).toFixed(2));
  return v % 1 === 0 ? v.toFixed(0) : v.toString();
}

export default function PointsTable({ rows, showTitle = true }: { rows: Row[]; showTitle?: boolean }) {
  const [sortCol, setSortCol] = useState<SortCol>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir(col === "name" ? "asc" : "desc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const cmp =
      sortCol === "name"
        ? a.name.localeCompare(b.name)
        : Number(a[sortCol]) - Number(b[sortCol]);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const maxValue = Math.max(...rows.map((r) => Number(r.value)));
  const max2026 = Math.max(...rows.map((r) => Number(r.pts2026)));
  const barMax = sortCol === "pts2026" ? max2026 : maxValue;
  const barKey = sortCol === "pts2026" ? "pts2026" : "value";

  function arrow(col: SortCol) {
    if (col !== sortCol) return <span className="text-zinc-600"> ↕</span>;
    return <span className="text-red-400"> {sortDir === "desc" ? "↓" : "↑"}</span>;
  }

  function ColHeader({ col, label, className }: { col: SortCol; label: string; className?: string }) {
    return (
      <button
        onClick={() => handleSort(col)}
        className={`text-xs uppercase tracking-wider hover:text-zinc-300 transition-colors ${
          sortCol === col ? "text-white" : "text-zinc-500"
        } ${className ?? ""}`}
      >
        {label}{arrow(col)}
      </button>
    );
  }

  return (
    <div>
      {showTitle && <h2 className="text-lg font-bold text-white mb-4">Most Points</h2>}
      <div className="flex items-center gap-4 px-4 mb-2">
        <span className="w-5" />
        <ColHeader col="name" label="Driver" className="flex-1 text-left" />
        <ColHeader col="value" label="Historical" className="w-20 text-right" />
        <ColHeader col="pts2026" label="2026 System" className="w-24 text-right" />
      </div>
      <div className="space-y-2 mb-10">
        {sorted.map((r, i) => (
          <div
            key={r.driverId}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4"
          >
            <span className="text-zinc-500 text-sm w-5 text-right font-mono">{i + 1}</span>
            <div className="flex-1">
              <Link
                href={`/drivers/${r.driverId}/`}
                className="text-white font-semibold text-sm hover:text-red-400 transition-colors"
              >
                {r.name}
              </Link>
              <div className="w-full bg-zinc-800 rounded-full h-1 mt-2">
                <div
                  className="h-1 rounded-full bg-red-500"
                  style={{ width: `${(Number(r[barKey]) / barMax) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-white font-bold text-sm w-20 text-right">{fmt(r.value)}</span>
            <span className="text-zinc-300 font-semibold text-sm w-24 text-right">{fmt(r.pts2026)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
