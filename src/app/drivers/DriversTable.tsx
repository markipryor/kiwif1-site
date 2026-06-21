"use client";

import { useState } from "react";
import Link from "next/link";

export type DriversRow = {
  id: number;
  firstName: string;
  surname: string;
  nationality: string;
  nationalityCode: string;
  indyOnly: boolean;
  current: boolean;
  championships: number;
  seasons: number;
  races: number;
  wins: number | string;
  podiums: number | string;
  poles: number | string;
  fastestLaps: number | string;
  points: number | string;
};

type SortCol = "name" | "nationality" | "championships" | "seasons" | "races" | "wins" | "podiums" | "poles" | "fastestLaps" | "points";

function fmt(n: number | string) {
  const v = Math.round(Number(n));
  return v.toString();
}

function Arrow({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <span className="text-zinc-700 ml-0.5">↕</span>;
  return <span className="text-red-400 ml-0.5">{sortDir === "desc" ? "↓" : "↑"}</span>;
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
        active
          ? "bg-red-500/20 border-red-500/40 text-red-400"
          : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
      }`}
    >
      <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${active ? "bg-red-500 border-red-500" : "border-zinc-500"}`}>
        {active && <span className="text-white text-xs leading-none">✓</span>}
      </span>
      {children}
    </button>
  );
}

function Stars({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="text-amber-400 text-xs leading-none shrink-0" title={`${count}× World Champion`}>
      {"★".repeat(count)}
    </span>
  );
}

export default function DriversTable({ drivers }: { drivers: DriversRow[] }) {
  const [sortCol, setSortCol] = useState<SortCol>("wins");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showIndy, setShowIndy] = useState(false);
  const [currentOnly, setCurrentOnly] = useState(false);

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir(col === "name" || col === "nationality" ? "asc" : "desc");
    }
  }

  const filtered = drivers
    .filter((d) => showIndy || !d.indyOnly)
    .filter((d) => !currentOnly || d.current);

  const sorted = [...filtered].sort((a, b) => {
    let cmp: number;
    if (sortCol === "name") {
      cmp = a.surname.localeCompare(b.surname) || a.firstName.localeCompare(b.firstName);
    } else if (sortCol === "nationality") {
      cmp = (a.nationality ?? "").localeCompare(b.nationality ?? "");
    } else {
      cmp = Number(a[sortCol]) - Number(b[sortCol]);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function Th({ col, label, right }: { col: SortCol; label: string; right?: boolean }) {
    return (
      <th className={`pb-3 ${right ? "text-right" : "text-left"}`}>
        <button
          onClick={() => handleSort(col)}
          className={`hover:text-white transition-colors ${sortCol === col ? "text-white" : "text-zinc-500"} uppercase text-xs tracking-wider`}
        >
          {label}<Arrow col={col} sortCol={sortCol} sortDir={sortDir} />
        </button>
      </th>
    );
  }

  const indyCount = drivers.filter((d) => d.indyOnly).length;
  const currentCount = drivers.filter((d) => d.current).length;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-500 text-sm">{sorted.length.toLocaleString()} drivers</p>
        <div className="flex items-center gap-2">
          <Toggle active={currentOnly} onClick={() => setCurrentOnly((v) => !v)}>
            Current drivers only ({currentCount})
          </Toggle>
          <Toggle active={showIndy} onClick={() => setShowIndy((v) => !v)}>
            Include Indy 500 ({indyCount})
          </Toggle>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <Th col="championships" label="★" right />
              <Th col="name" label="Driver" />
              <Th col="nationality" label="Nat" />
              <Th col="seasons" label="Seasons" right />
              <Th col="races" label="Races" right />
              <Th col="wins" label="Wins" right />
              <Th col="podiums" label="Podiums" right />
              <Th col="poles" label="Poles" right />
              <Th col="fastestLaps" label="FL" right />
              <Th col="points" label="Points" right />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.map((d) => (
              <tr key={d.id} className="hover:bg-zinc-900/60 transition-colors">
                <td className="py-2.5 text-amber-400 text-right font-mono text-xs pr-2">
                  {d.championships > 0 ? "★".repeat(d.championships) : ""}
                </td>
                <td className="py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/drivers/${d.id}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                      {d.firstName} {d.surname}
                    </Link>
                    {d.current && (
                      <span className="text-xs bg-green-900/50 text-green-400 border border-green-700/40 px-1.5 py-0.5 rounded">Current</span>
                    )}
                    {d.indyOnly && (
                      <span className="text-xs bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">Indy</span>
                    )}
                  </div>
                </td>
                <td className="py-2.5">
                  <span
                    className={`fi fi-${d.nationalityCode.toLowerCase()} fis`}
                    title={d.nationality}
                    style={{ fontSize: "1.25rem" }}
                  />
                </td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{d.seasons}</td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{d.races}</td>
                <td className="py-2.5 text-right font-mono">
                  <span className={Number(d.wins) > 0 ? "text-white font-semibold" : "text-zinc-500"}>{d.wins}</span>
                </td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{d.podiums}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{fmt(d.poles)}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{fmt(d.fastestLaps)}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{fmt(d.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
