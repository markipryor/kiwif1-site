"use client";

import { useState } from "react";
import Link from "next/link";

type SeasonRow = {
  year: number;
  constructor: string;
  constructorId: number;
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  points: number;
  isComplete: number;
  teammateData: string | null;
};

type RaceRow = {
  year: number;
  grandprixId: number;
  raceTitle: string;
  grid: string;
  place: string;
  points: number;
  hasFastestLap: boolean;
  constructorId: number;
  constructorName: string;
};

type SeasonPosition = { year: number; champPos: number };

type Teammate = { id: number; name: string };

type MergedSeason = {
  year: number;
  isComplete: number;
  constructors: { name: string; id: number }[];
  teammates: Teammate[];
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  points: number;
};

function fmt(n: number) {
  return n > 0 ? n : <span className="text-zinc-600">—</span>;
}

function parseTeammateData(data: string | null): Teammate[] {
  if (!data) return [];
  return data.split('|').filter(Boolean).map(t => {
    const idx = t.indexOf('::');
    if (idx === -1) return { id: 0, name: t };
    return { id: Number(t.slice(0, idx)), name: t.slice(idx + 2) };
  });
}

function RaceRowEl({ r }: { r: RaceRow }) {
  return (
    <tr key={r.grandprixId} className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-900/40">
      <td className="px-4 py-1.5">
        <Link href={`/races/${r.grandprixId}/`} className="text-zinc-300 hover:text-white transition-colors">
          {r.raceTitle}
        </Link>
      </td>
      <td className="px-4 py-1.5 text-right font-mono text-zinc-500">{r.grid || "—"}</td>
      <td className="px-4 py-1.5 text-right font-mono">
        <span className={r.place === "1" ? "text-yellow-400 font-bold" : "text-zinc-300"}>{r.place || "—"}</span>
      </td>
      <td className="px-4 py-1.5 text-center">
        {r.hasFastestLap ? <span className="text-purple-400 text-xs font-mono" title="Fastest Lap">FL</span> : null}
      </td>
      <td className="px-4 py-1.5 text-right font-mono text-zinc-400">
        {Number(r.points) > 0 ? Number(r.points).toFixed(0) : "—"}
      </td>
    </tr>
  );
}

export default function DriverSeasonTable({
  seasons,
  raceResults,
  seasonPositions,
}: {
  seasons: SeasonRow[];
  raceResults: RaceRow[];
  seasonPositions: SeasonPosition[];
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const posMap = new Map(seasonPositions.map((p) => [p.year, p.champPos]));

  const resultsByYear = new Map<number, RaceRow[]>();
  for (const r of raceResults) {
    if (!resultsByYear.has(r.year)) resultsByYear.set(r.year, []);
    resultsByYear.get(r.year)!.push(r);
  }

  // Merge multi-constructor stints into one row per year
  const mergedMap = new Map<number, MergedSeason>();
  const yearOrder: number[] = [];
  for (const s of seasons) {
    if (!mergedMap.has(s.year)) {
      yearOrder.push(s.year);
      mergedMap.set(s.year, {
        year: s.year,
        isComplete: s.isComplete,
        constructors: [{ name: s.constructor, id: s.constructorId }],
        teammates: parseTeammateData(s.teammateData),
        races: Number(s.races),
        wins: Number(s.wins),
        podiums: Number(s.podiums),
        poles: Number(s.poles),
        fastestLaps: Number(s.fastestLaps),
        points: Number(s.points),
      });
    } else {
      const m = mergedMap.get(s.year)!;
      m.constructors.push({ name: s.constructor, id: s.constructorId });
      const existingIds = new Set(m.teammates.map(t => t.id));
      for (const tm of parseTeammateData(s.teammateData)) {
        if (!existingIds.has(tm.id)) {
          m.teammates.push(tm);
          existingIds.add(tm.id);
        }
      }
      m.races += Number(s.races);
      m.wins += Number(s.wins);
      m.podiums += Number(s.podiums);
      m.poles += Number(s.poles);
      m.fastestLaps += Number(s.fastestLaps);
      m.points += Number(s.points);
    }
  }
  const mergedSeasons = yearOrder.map((y) => mergedMap.get(y)!);

  function toggle(year: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto mb-12">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
            <th className="pb-3 text-left">Year</th>
            <th className="pb-3 text-right">Pos</th>
            <th className="pb-3 text-left pl-4">Constructor</th>
            <th className="pb-3 text-left pl-4">Teammate(s)</th>
            <th className="pb-3 text-right">Races</th>
            <th className="pb-3 text-right">Wins</th>
            <th className="pb-3 text-right">Pods</th>
            <th className="pb-3 text-right">Poles</th>
            <th className="pb-3 text-right">FL</th>
            <th className="pb-3 text-right">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {mergedSeasons.flatMap((s) => {
            const isExpanded = expanded.has(s.year);
            const pos = posMap.get(s.year);
            const races = resultsByYear.get(s.year) ?? [];
            const multiConstructor = s.constructors.length > 1;

            const rows: React.ReactNode[] = [
              <tr key={s.year} className="hover:bg-zinc-900/60 transition-colors">
                <td className="py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggle(s.year)}
                      className="text-zinc-600 hover:text-zinc-400 text-xs w-3 shrink-0 transition-colors"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                    <Link href={`/seasons/${s.year}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                      {s.year}
                    </Link>
                    {!s.isComplete && (
                      <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-700/40 px-1.5 py-0.5 rounded-full leading-none">In Progress</span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 text-right font-mono">
                  {pos != null ? (
                    <span className={pos === 1 ? "text-yellow-400 font-bold" : "text-zinc-400"}>P{pos}</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="py-2.5 pl-4">
                  {s.constructors.length === 1 ? (
                    <Link href={`/constructors/${s.constructors[0].id}/`} className="text-zinc-400 hover:text-white transition-colors">
                      {s.constructors[0].name}
                    </Link>
                  ) : (
                    <span>
                      {s.constructors.map((c, i) => (
                        <span key={c.id}>
                          {i > 0 && <span className="text-zinc-600"> / </span>}
                          <Link href={`/constructors/${c.id}/`} className="text-zinc-400 hover:text-white transition-colors">
                            {c.name}
                          </Link>
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="py-2.5 pl-4 text-sm">
                  {s.teammates.length > 0 ? (
                    <span>
                      {s.teammates.map((tm, i) => (
                        <span key={tm.id}>
                          {i > 0 && <span className="text-zinc-700">, </span>}
                          <Link href={`/drivers/${tm.id}/`} className="text-zinc-500 hover:text-white transition-colors">
                            {tm.name}
                          </Link>
                        </span>
                      ))}
                    </span>
                  ) : <span className="text-zinc-700">—</span>}
                </td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{s.races}</td>
                <td className="py-2.5 text-right font-mono">
                  <span className={s.wins > 0 ? "text-white font-semibold" : "text-zinc-500"}>{s.wins}</span>
                </td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{fmt(s.podiums)}</td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{fmt(s.poles)}</td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{fmt(s.fastestLaps)}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{s.points.toFixed(0)}</td>
              </tr>,
            ];

            if (isExpanded) {
              // Group races by constructor when driver switched teams mid-season
              let raceBody: React.ReactNode;
              if (multiConstructor && races.length > 0) {
                const groups = new Map<number, { name: string; races: RaceRow[] }>();
                const order: number[] = [];
                for (const r of races) {
                  if (!groups.has(r.constructorId)) {
                    order.push(r.constructorId);
                    groups.set(r.constructorId, { name: r.constructorName, races: [] });
                  }
                  groups.get(r.constructorId)!.races.push(r);
                }
                raceBody = order.map((cid) => {
                  const { name, races: cRaces } = groups.get(cid)!;
                  return (
                    <>
                      <tr key={`${cid}-hdr`} className="bg-zinc-900/50">
                        <td colSpan={5} className="px-4 py-1 text-zinc-500 text-xs font-medium">{name}</td>
                      </tr>
                      {cRaces.map((r) => <RaceRowEl key={r.grandprixId} r={r} />)}
                    </>
                  );
                });
              } else {
                raceBody = races.length > 0
                  ? races.map((r) => <RaceRowEl key={r.grandprixId} r={r} />)
                  : (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-zinc-600 text-center">No race detail available</td>
                    </tr>
                  );
              }

              rows.push(
                <tr key={`${s.year}-races`}>
                  <td colSpan={10} className="pb-3 pt-0">
                    <div className="ml-5 mt-1 bg-zinc-950/60 rounded-lg border border-zinc-800/40 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-zinc-600 border-b border-zinc-800/60">
                            <th className="px-4 py-2 text-left font-normal uppercase tracking-wider">Race</th>
                            <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">Grid</th>
                            <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">Finish</th>
                            <th className="px-4 py-2 text-center font-normal uppercase tracking-wider w-8"></th>
                            <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {raceBody}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              );
            }

            return rows;
          })}
        </tbody>
      </table>
    </div>
  );
}
