"use client";

import { useState } from "react";
import Link from "next/link";
import type { AgeRow, AgeRecordSet, ConsecRow, ConstructorConsecRow } from "@/lib/queries";

export type { AgeRow, AgeRecordSet };

const TABS = ["Most", "Youngest", "Oldest", "Consecutive", "Constructors", "Other"] as const;
type Tab = typeof TABS[number];

export type RecordRow = { driverId: number; name: string; value: number; current?: number };
export type PointsRow = RecordRow & { pts2026: number };
export type { ConsecRow, ConstructorConsecRow };
export type ConstructorRecordRow = { constructorId: number; name: string; value: number; current: number };

export interface RecordsData {
  wins: RecordRow[];
  podiums: RecordRow[];
  poles: RecordRow[];
  fastestLaps: RecordRow[];
  points: PointsRow[];
  races: RecordRow[];
}

export interface ConsecutiveData {
  wins: ConsecRow[];
  podiums: ConsecRow[];
  poles: ConsecRow[];
  fastestLaps: ConsecRow[];
  points: ConsecRow[];
  finishes: ConsecRow[];
  starts: ConsecRow[];
}

export interface ConstructorRecordsData {
  wins: ConstructorRecordRow[];
  podiums: ConstructorRecordRow[];
  poles: ConstructorRecordRow[];
  fastestLaps: ConstructorRecordRow[];
  points: ConstructorRecordRow[];
  entries: ConstructorRecordRow[];
}

export interface ConstructorConsecutiveData {
  wins: ConstructorConsecRow[];
  podiums: ConstructorConsecRow[];
}

export interface OtherRecordsData {
  hatTricks: RecordRow[];
  startsWithoutWin: RecordRow[];
  winsFromPole: RecordRow[];
  winsFromNonPole: RecordRow[];
  podiumsWithoutWin: RecordRow[];
  startsWithoutPoints: RecordRow[];
  dnfs: RecordRow[];
  constructorsRacedFor: RecordRow[];
  lowestGridWin: RecordRow[];
}

export type AgeRecords = {
  youngest: { wins: AgeRecordSet; podiums: AgeRecordSet; poles: AgeRecordSet; fastestLaps: AgeRecordSet; points: AgeRecordSet; races: AgeRecordSet };
  oldest:   { wins: AgeRecordSet; podiums: AgeRecordSet; poles: AgeRecordSet; fastestLaps: AgeRecordSet; points: AgeRecordSet; races: AgeRecordSet };
};

function fmt(n: number | string) {
  const v = parseFloat(Number(n).toFixed(2));
  return v % 1 === 0 ? v.toFixed(0) : v.toString();
}

function computeRanks(rows: { value: number | string }[]): string[] {
  const values = rows.map(r => Number(r.value));
  const ranks: string[] = [];
  let currentRank = 1;
  for (let i = 0; i < values.length; i++) {
    if (i > 0 && values[i] !== values[i - 1]) currentRank = i + 1;
    ranks.push(currentRank.toString());
  }
  const counts = new Map<string, number>();
  ranks.forEach(r => counts.set(r, (counts.get(r) ?? 0) + 1));
  return ranks.map(r => (counts.get(r) ?? 0) > 1 ? `=${r}` : r);
}

function fmtAge(ageDays: number) {
  const years = Math.floor(ageDays / 365);
  const days = ageDays - years * 365;
  return `${years}y ${days}d`;
}

// ─── Driver row (Most + Consecutive tabs) ─────────────────────────────────────

function DriverRowItem({ rank, row, max }: { rank: string; row: RecordRow; max: number }) {
  const c = row as ConsecRow;
  const hasConsec = "startGp" in row;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 flex items-center gap-4">
      <span className="text-zinc-500 text-sm w-7 text-right font-mono shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/drivers/${row.driverId}/`} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">
            {row.name}
          </Link>
          {!!row.current && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-medium">Current</span>
          )}
          {hasConsec && !!c.isOngoing && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">Ongoing</span>
          )}
        </div>
        {hasConsec && c.startGp && c.endGp && (
          <p className="text-zinc-500 text-xs mt-0.5">{c.startGp} → {c.endGp}</p>
        )}
        <div className="w-full bg-zinc-700 rounded-full h-1 mt-2">
          <div className="h-1 rounded-full bg-red-500" style={{ width: `${(row.value / max) * 100}%` }} />
        </div>
      </div>
      <span className="text-white font-bold text-base w-12 text-right shrink-0">{fmt(row.value)}</span>
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
          {(() => {
            const rankStrings = computeRanks(top10);
            return top10.map((r, i) => (
              <DriverRowItem key={r.driverId} rank={rankStrings[i]} row={r} max={max} />
            ));
          })()}
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

// ─── Constructor row ───────────────────────────────────────────────────────────

function ConstructorRowItem({ rank, row, max }: { rank: string; row: ConstructorRecordRow | ConstructorConsecRow; max: number }) {
  const c = row as ConstructorConsecRow;
  const hasConsec = "startGp" in row;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 flex items-center gap-4">
      <span className="text-zinc-500 text-sm w-7 text-right font-mono shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/constructors/${row.constructorId}/`} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">
            {row.name}
          </Link>
          {!!row.current && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-medium">Current</span>
          )}
          {hasConsec && !!c.isOngoing && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">Ongoing</span>
          )}
        </div>
        {hasConsec && c.startGp && c.endGp && (
          <p className="text-zinc-500 text-xs mt-0.5">{c.startGp} → {c.endGp}</p>
        )}
        <div className="w-full bg-zinc-700 rounded-full h-1 mt-2">
          <div className="h-1 rounded-full bg-red-500" style={{ width: `${(row.value / max) * 100}%` }} />
        </div>
      </div>
      <span className="text-white font-bold text-base w-12 text-right shrink-0">{fmt(row.value)}</span>
    </div>
  );
}

function ConstructorSection({ label, rows, slug, isOpen, onToggle }: {
  label: string;
  rows: (ConstructorRecordRow | ConstructorConsecRow)[];
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
          {(() => {
            const rankStrings = computeRanks(top10);
            return top10.map((r, i) => (
              <ConstructorRowItem key={`${r.constructorId}-${i}`} rank={rankStrings[i]} row={r} max={max} />
            ));
          })()}
          <div className="pt-3 text-center">
            <Link
              href={`/records/constructors/${slug}/`}
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

export default function RecordsClient({
  data,
  ageRecords,
  consecutive,
  constructorRecords,
  constructorConsecutive,
  otherRecords,
}: {
  data: RecordsData;
  ageRecords: AgeRecords;
  consecutive: ConsecutiveData;
  constructorRecords: ConstructorRecordsData;
  constructorConsecutive: ConstructorConsecutiveData;
  otherRecords: OtherRecordsData;
}) {
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

  const consSections: { label: string; rows: ConsecRow[]; slug: string }[] = [
    { label: "Consecutive Wins",            rows: consecutive.wins,        slug: "cons-wins" },
    { label: "Consecutive Podiums",         rows: consecutive.podiums,     slug: "cons-podiums" },
    { label: "Consecutive Pole Positions",  rows: consecutive.poles,       slug: "cons-poles" },
    { label: "Consecutive Fastest Laps",    rows: consecutive.fastestLaps, slug: "cons-fastest-laps" },
    { label: "Consecutive Points Finishes", rows: consecutive.points,      slug: "cons-points" },
    { label: "Consecutive Finishes",        rows: consecutive.finishes,    slug: "cons-finishes" },
    { label: "Consecutive Race Starts",     rows: consecutive.starts,      slug: "cons-starts" },
  ];

  const constructorSections: { label: string; rows: (ConstructorRecordRow | ConstructorConsecRow)[]; slug: string }[] = [
    { label: "Most Constructor Wins",    rows: constructorRecords.wins,        slug: "wins" },
    { label: "Most Constructor Podiums", rows: constructorRecords.podiums,     slug: "podiums" },
    { label: "Most Pole Positions",      rows: constructorRecords.poles,       slug: "poles" },
    { label: "Most Fastest Laps",        rows: constructorRecords.fastestLaps, slug: "fastest-laps" },
    { label: "Most Points",              rows: constructorRecords.points,      slug: "points" },
    { label: "Most Race Entries",        rows: constructorRecords.entries,     slug: "entries" },
    { label: "Consecutive Wins",         rows: constructorConsecutive.wins,    slug: "cons-wins" },
    { label: "Consecutive Podiums",      rows: constructorConsecutive.podiums, slug: "cons-podiums" },
  ];

  const ageSections = (group: AgeRecords["youngest"], prefix: string) => [
    { label: `${prefix} Race Winner`,     set: group.wins,        id: `${prefix}-wins` },
    { label: `${prefix} Podium Finisher`, set: group.podiums,     id: `${prefix}-podiums` },
    { label: `${prefix} Pole Position`,   set: group.poles,       id: `${prefix}-poles` },
    { label: `${prefix} Fastest Lap`,     set: group.fastestLaps, id: `${prefix}-fl` },
    { label: `${prefix} Points Scorer`,   set: group.points,      id: `${prefix}-points` },
    { label: `${prefix} Race Starter`,    set: group.races,       id: `${prefix}-races` },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
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

      {tab === "Consecutive" && (
        <div className="space-y-3">
          {consSections.map(s => (
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

      {tab === "Constructors" && (
        <div className="space-y-3">
          {constructorSections.map((s, i) => (
            <ConstructorSection
              key={s.slug}
              label={s.label}
              rows={s.rows}
              slug={s.slug}
              isOpen={open.has(`c-${s.slug}`)}
              onToggle={() => toggle(`c-${s.slug}`)}
            />
          ))}
        </div>
      )}

      {tab === "Other" && (
        <div className="space-y-3">
          <RecordSection label="Most Hat-Tricks (Win, Pole & Fastest Lap)" rows={otherRecords.hatTricks} slug="hat-tricks" isOpen={open.has("hat-tricks")} onToggle={() => toggle("hat-tricks")} />
          <RecordSection label="Most Wins from Pole Position" rows={otherRecords.winsFromPole} slug="wins-from-pole" isOpen={open.has("wins-from-pole")} onToggle={() => toggle("wins-from-pole")} />
          <RecordSection label="Most Wins from Non-Pole" rows={otherRecords.winsFromNonPole} slug="wins-from-non-pole" isOpen={open.has("wins-from-non-pole")} onToggle={() => toggle("wins-from-non-pole")} />
          <RecordSection label="Most Podiums Without a Win" rows={otherRecords.podiumsWithoutWin} slug="podiums-without-win" isOpen={open.has("podiums-without-win")} onToggle={() => toggle("podiums-without-win")} />
          <RecordSection label="Most Starts Without a Win" rows={otherRecords.startsWithoutWin} slug="starts-without-win" isOpen={open.has("starts-without-win")} onToggle={() => toggle("starts-without-win")} />
          <RecordSection label="Most Starts Without Scoring a Point" rows={otherRecords.startsWithoutPoints} slug="starts-without-points" isOpen={open.has("starts-without-points")} onToggle={() => toggle("starts-without-points")} />
          <RecordSection label="Most DNFs" rows={otherRecords.dnfs} slug="most-dnfs" isOpen={open.has("most-dnfs")} onToggle={() => toggle("most-dnfs")} />
          <RecordSection label="Most Constructors Raced For" rows={otherRecords.constructorsRacedFor} slug="constructors-raced-for" isOpen={open.has("constructors-raced-for")} onToggle={() => toggle("constructors-raced-for")} />
          <RecordSection label="Lowest Starting Position for a Race Win" rows={otherRecords.lowestGridWin} slug="lowest-grid-win" isOpen={open.has("lowest-grid-win")} onToggle={() => toggle("lowest-grid-win")} />
        </div>
      )}
    </div>
  );
}
