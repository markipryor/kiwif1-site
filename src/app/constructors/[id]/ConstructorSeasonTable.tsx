"use client";

import { useState } from "react";
import Link from "next/link";

type SeasonRow = {
  year: number;
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  points: number;
  isComplete: number;
};

type DriverRow = {
  year: number;
  driverId: number;
  driver: string;
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  points: number;
};

type ChampInfoRow = {
  year: number;
  wccPos: number | null;
  bestDriverWdcPos: number | null;
};

function fmt(n: number | string) {
  const v = Number(n);
  return v === 0 ? <span className="text-zinc-600">—</span> : v;
}

export default function ConstructorSeasonTable({
  seasons,
  driverRows,
  champInfo,
  driverWdcPos,
}: {
  seasons: SeasonRow[];
  driverRows: DriverRow[];
  champInfo: ChampInfoRow[];
  driverWdcPos: Record<string, number>;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const byYear = new Map<number, DriverRow[]>();
  for (const d of driverRows) {
    if (!byYear.has(d.year)) byYear.set(d.year, []);
    byYear.get(d.year)!.push(d);
  }

  const champMap = new Map(champInfo.map((c) => [c.year, c]));

  function toggle(year: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
            <th className="pb-3 text-left">Year</th>
            <th className="pb-3 text-right w-12">WCC</th>
            <th className="pb-3 text-right">Races</th>
            <th className="pb-3 text-right">Wins</th>
            <th className="pb-3 text-right">Podiums</th>
            <th className="pb-3 text-right">Poles</th>
            <th className="pb-3 text-right">FL</th>
            <th className="pb-3 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {seasons.map((s) => {
            const isExpanded = expanded.has(s.year);
            const drivers = byYear.get(s.year) ?? [];
            const champ = champMap.get(s.year);
            const isWcc = champ?.wccPos === 1;
            return (
              <>
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
                  <td className="py-2.5 text-right font-mono w-12">
                    {champ?.wccPos != null ? (
                      <span className={isWcc ? "text-yellow-400 font-bold" : "text-zinc-400"}>
                        P{champ.wccPos}
                      </span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-zinc-300 text-right font-mono">{s.races}</td>
                  <td className="py-2.5 text-right font-mono">
                    <span className={Number(s.wins) > 0 ? "text-white font-semibold" : "text-zinc-600"}>
                      {Number(s.wins) > 0 ? s.wins : "—"}
                    </span>
                  </td>
                  <td className="py-2.5 text-zinc-300 text-right font-mono">{fmt(s.podiums)}</td>
                  <td className="py-2.5 text-zinc-300 text-right font-mono">{fmt(s.poles)}</td>
                  <td className="py-2.5 text-zinc-300 text-right font-mono">{fmt(s.fastestLaps)}</td>
                  <td className="py-2.5 text-zinc-400 text-right font-mono">{Number(s.points).toFixed(0)}</td>
                </tr>
                {isExpanded && (
                  <tr key={`${s.year}-drivers`}>
                    <td colSpan={8} className="pb-3 pt-0">
                      <div className="ml-5 mt-1 bg-zinc-950/60 rounded-lg border border-zinc-800/40 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-zinc-600 border-b border-zinc-800/60">
                              <th className="px-4 py-2 text-left font-normal uppercase tracking-wider">Driver</th>
                              <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">WDC</th>
                              <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">Races</th>
                              <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">Wins</th>
                              <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">Pods</th>
                              <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">Poles</th>
                              <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">FL</th>
                              <th className="px-4 py-2 text-right font-normal uppercase tracking-wider">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drivers.map((d) => {
                              const wdc = driverWdcPos[`${s.year}-${d.driverId}`] ?? null;
                              return (
                              <tr key={d.driverId} className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-900/40">
                                <td className="px-4 py-1.5">
                                  <Link href={`/drivers/${d.driverId}/`} className="text-zinc-300 hover:text-white transition-colors">
                                    {d.driver}
                                  </Link>
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono">
                                  {wdc != null ? (
                                    <span className={wdc === 1 ? "text-yellow-400 font-bold" : "text-zinc-500"}>P{wdc}</span>
                                  ) : (
                                    <span className="text-zinc-700">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono text-zinc-400">{d.races}</td>
                                <td className="px-4 py-1.5 text-right font-mono">
                                  <span className={Number(d.wins) > 0 ? "text-yellow-400 font-bold" : "text-zinc-600"}>
                                    {Number(d.wins) > 0 ? d.wins : "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono text-zinc-400">{fmt(d.podiums)}</td>
                                <td className="px-4 py-1.5 text-right font-mono text-zinc-400">{fmt(d.poles)}</td>
                                <td className="px-4 py-1.5 text-right font-mono text-zinc-400">{fmt(d.fastestLaps)}</td>
                                <td className="px-4 py-1.5 text-right font-mono text-zinc-400">
                                  {Number(d.points) > 0 ? Number(d.points).toFixed(0) : "—"}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
