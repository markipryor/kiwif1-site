"use client";

import { useState, useMemo } from "react";
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

export default function DriversTable({ drivers }: { drivers: DriversRow[] }) {
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showIndy, setShowIndy] = useState(false);
  const [currentOnly, setCurrentOnly] = useState(false);
  const [nationality, setNationality] = useState("");

  const nationalities = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const d of drivers) {
      if (d.nationality && !seen.has(d.nationality)) {
        seen.add(d.nationality);
        list.push(d.nationality);
      }
    }
    return list.sort();
  }, [drivers]);

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
    .filter((d) => !currentOnly || d.current)
    .filter((d) => !nationality || d.nationality === nationality);

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

  const totals = sorted.reduce(
    (acc, d) => ({
      races: acc.races + Number(d.races),
      wins: acc.wins + Number(d.wins),
      podiums: acc.podiums + Number(d.podiums),
      poles: acc.poles + Number(d.poles),
      fastestLaps: acc.fastestLaps + Number(d.fastestLaps),
      points: acc.points + Number(d.points),
    }),
    { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, points: 0 }
  );

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-zinc-500 text-sm">{sorted.length.toLocaleString()} drivers</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 focus:outline-none focus:border-zinc-500"
          >
            <option value="">All nationalities</option>
            {nationalities.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
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
                <td className="py-2.5 text-amber-400 text-right font-mono text-xs pr-2 leading-tight">
                  {d.championships > 4 ? (
                    <span className="inline-flex flex-col items-end">
                      <span>{"★".repeat(Math.ceil(d.championships / 2))}</span>
                      <span>{"★".repeat(Math.floor(d.championships / 2))}</span>
                    </span>
                  ) : d.championships > 0 ? "★".repeat(d.championships) : ""}
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
            <tr className="border-t-2 border-zinc-700 text-zinc-500 text-xs">
              <td className="py-2"></td>
              <td className="py-2 text-zinc-400 font-medium">Total ({sorted.length})</td>
              <td className="py-2"></td>
              <td className="py-2"></td>
              <td className="py-2 text-right font-mono">{totals.races.toLocaleString()}</td>
              <td className="py-2 text-right font-mono">{totals.wins.toLocaleString()}</td>
              <td className="py-2 text-right font-mono">{totals.podiums.toLocaleString()}</td>
              <td className="py-2 text-right font-mono">{totals.poles.toLocaleString()}</td>
              <td className="py-2 text-right font-mono">{totals.fastestLaps.toLocaleString()}</td>
              <td className="py-2 text-right font-mono">{Math.round(totals.points).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
