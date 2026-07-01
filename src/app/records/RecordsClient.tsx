"use client";

import { useState } from "react";
import Link from "next/link";
import type { AgeRow, AgeRecordSet } from "@/lib/queries";

export type { AgeRow, AgeRecordSet };

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

export type AgeRecords = {
  youngest: { wins: AgeRecordSet; podiums: AgeRecordSet; poles: AgeRecordSet; fastestLaps: AgeRecordSet; points: AgeRecordSet; races: AgeRecordSet };
  oldest:   { wins: AgeRecordSet; podiums: AgeRecordSet; poles: AgeRecordSet; fastestLaps: AgeRecordSet; points: AgeRecordSet; races: AgeRecordSet };
};

function fmt(n: number | string) {
  const v = parseFloat(Number(n).toFixed(2));
  return v % 1 === 0 ? v.toFixed(0) : v.toString();
}

function fmtAge(ageDays: number) {
  const years = Math.floor(ageDays / 365);
  const days = ageDays - years * 365;
  return `${years}y ${days}d`;
}

// ─── Most tab components ───────────────────────────────────────────────────────

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

// ─── Age tab components ────────────────────────────────────────────────────────

function AgeRowItem({ rank, row, highlight }: { rank: number; row: AgeRow; highlight?: boolean }) {
  return (
    <div className={`border rounded-lg px-4 py-3 flex items-center gap-4 ${
      highlight
        ? "bg-red-950/30 border-red-800/40"
        : "bg-zinc-800 border-zinc-700"
    }`}>
      <span className="text-zinc-500 text-sm w-5 text-right font-mono shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <Link href={`/drivers/${row.driverId}/`} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">
          {row.name}
        </Link>
        <p className="text-zinc-500 text-xs mt-0.5">{row.achievedDate}</p>
      </div>
      <span className={`font-bold text-sm text-right shrink-0 ${highlight ? "text-red-400" : "text-white"}`}>
        {fmtAge(row.ageDays)}
      </span>
    </div>
  );
}

function AgeSection({ label, set, isOpen, onToggle }: {
  label: string;
  set: AgeRecordSet;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const leader = set.top10[0];

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
              {leader.name} · {fmtAge(leader.ageDays)}
            </span>
          )}
        </div>
        <span className="text-zinc-400 text-xl shrink-0 leading-none">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div className="bg-zinc-950 border-t border-zinc-800 px-5 py-4 space-y-2">
          {set.top10.map((r, i) => (
            <AgeRowItem key={r.driverId} rank={i + 1} row={r} highlight={r.current} />
          ))}
          {set.currentEntry && (
            <>
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-zinc-800" />
                <span className="text-zinc-600 text-xs shrink-0">current grid</span>
                <div className="flex-1 border-t border-zinc-800" />
              </div>
              <AgeRowItem rank={set.currentEntry.rank} row={set.currentEntry.row} highlight />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function RecordsClient({ data, ageRecords }: { data: RecordsData; ageRecords: AgeRecords }) {
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

  const ageSections = (group: AgeRecords["youngest"], prefix: string) => [
    { label: `${prefix} Race Winner`,      set: group.wins,        id: `${prefix}-wins` },
    { label: `${prefix} Podium Finisher`,  set: group.podiums,     id: `${prefix}-podiums` },
    { label: `${prefix} Pole Position`,    set: group.poles,       id: `${prefix}-poles` },
    { label: `${prefix} Fastest Lap`,      set: group.fastestLaps, id: `${prefix}-fl` },
    { label: `${prefix} Points Scorer`,    set: group.points,      id: `${prefix}-points` },
    { label: `${prefix} Race Starter`,     set: group.races,       id: `${prefix}-races` },
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

      {tab === "Youngest" && (
        <div className="space-y-3">
          {ageSections(ageRecords.youngest, "Youngest").map(s => (
            <AgeSection
              key={s.id}
              label={s.label}
              set={s.set}
              isOpen={open.has(s.id)}
              onToggle={() => toggle(s.id)}
            />
          ))}
        </div>
      )}

      {tab === "Oldest" && (
        <div className="space-y-3">
          {ageSections(ageRecords.oldest, "Oldest").map(s => (
            <AgeSection
              key={s.id}
              label={s.label}
              set={s.set}
              isOpen={open.has(s.id)}
              onToggle={() => toggle(s.id)}
            />
          ))}
        </div>
      )}

      {(tab === "Consecutive" || tab === "Other") && (
        <div className="text-center py-20">
          <p className="text-zinc-600 text-sm">Coming soon</p>
        </div>
      )}
    </div>
  );
}
