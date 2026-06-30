"use client";

import { useState } from "react";
import Link from "next/link";

const TABS = ["Most", "Youngest", "Oldest", "Consecutive", "Other"] as const;
type Tab = typeof TABS[number];

export type RecordRow = { driverId: number; name: string; value: number };
export type PointsRow = RecordRow & { pts2026: number };

export interface RecordsData {
  wins: RecordRow[];
  podiums: RecordRow[];
  poles: RecordRow[];
  fastestLaps: RecordRow[];
  points: PointsRow[];
  races: RecordRow[];
}

function fmt(n: number | string) {
  const v = parseFloat(Number(n).toFixed(2));
  return v % 1 === 0 ? v.toFixed(0) : v.toString();
}

function RowItem({ rank, driverId, name, value, max }: {
  rank: number; driverId: number; name: string; value: number; max: number;
}) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 flex items-center gap-4">
      <span className="text-zinc-500 text-sm w-5 text-right font-mono shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <Link href={`/drivers/${driverId}/`} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">
          {name}
        </Link>
        <div className="w-full bg-zinc-700 rounded-full h-1 mt-2">
          <div className="h-1 rounded-full bg-red-500" style={{ width: `${(value / max) * 100}%` }} />
        </div>
      </div>
      <span className="text-white font-bold text-base w-12 text-right shrink-0">{fmt(value)}</span>
    </div>
  );
}

function RecordSection({ label, rows, slug, isOpen, onToggle }: {
  label: string;
  rows: RecordRow[];
  slug: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const top10 = rows.slice(0, 10);
  const max = Number(rows[0]?.value ?? 1);
  const leader = rows[0];

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 bg-zinc-900 hover:bg-zinc-800/80 transition-colors text-left"
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-white font-semibold">{label}</span>
          {leader && (
            <span className="text-zinc-500 text-sm truncate">
              {leader.name} · {fmt(leader.value)}
            </span>
          )}
        </div>
        <span className="text-zinc-400 text-xl shrink-0 leading-none">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div className="bg-zinc-950 border-t border-zinc-800 px-5 py-4 space-y-2">
          {top10.map((r, i) => (
            <RowItem key={r.driverId} rank={i + 1} driverId={r.driverId} name={r.name} value={Number(r.value)} max={max} />
          ))}
          <div className="pt-3 text-center">
            <Link
              href={`/records/${slug}/`}
              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
            >
              View full list ({rows.length}) →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecordsClient({ data }: { data: RecordsData }) {
  const [tab, setTab] = useState<Tab>("Most");
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const mostSections: { label: string; rows: RecordRow[]; slug: string }[] = [
    { label: "Most Wins",           rows: data.wins,        slug: "wins" },
    { label: "Most Podiums",        rows: data.podiums,     slug: "podiums" },
    { label: "Most Pole Positions", rows: data.poles,       slug: "poles" },
    { label: "Most Fastest Laps",   rows: data.fastestLaps, slug: "fastest-laps" },
    { label: "Most Points",         rows: data.points,      slug: "points" },
    { label: "Most Race Starts",    rows: data.races,       slug: "race-starts" },
  ];

  return (
    <div>
      <div className="flex gap-1 mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Most" && (
        <div className="space-y-3">
          {mostSections.map(s => (
            <RecordSection
              key={s.slug}
              label={s.label}
              rows={s.rows}
              slug={s.slug}
              isOpen={open.has(s.slug)}
              onToggle={() => toggle(s.slug)}
            />
          ))}
        </div>
      )}

      {(tab === "Youngest" || tab === "Oldest" || tab === "Consecutive" || tab === "Other") && (
        <div className="text-center py-20">
          <p className="text-zinc-600 text-sm">Coming soon</p>
        </div>
      )}
    </div>
  );
}
