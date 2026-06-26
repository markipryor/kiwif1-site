"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export type ConstructorRow = {
  id: number;
  name: string;
  shortName: string;
  nationality: string;
  nationalityCode: string;
  indyOnly: boolean;
  current: boolean;
  championships: number;
  races: number;
  wins: number | string;
  podiums: number | string;
  poles: number | string;
  points: number | string;
  firstSeason: number;
  lastSeason: number;
  drivers: number;
};

type SortCol = "championships" | "name" | "nationality" | "firstSeason" | "lastSeason" | "races" | "wins" | "podiums" | "poles" | "points";

function fmt(n: number | string) {
  return Math.round(Number(n)).toString();
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

export default function ConstructorsTable({ constructors }: { constructors: ConstructorRow[] }) {
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentOnly, setCurrentOnly] = useState(false);
  const [showIndy, setShowIndy] = useState(false);
  const [nationalityFilter, setNationalityFilter] = useState("");

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir(col === "name" || col === "nationality" ? "asc" : "desc");
    }
  }

  const nationalities = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of constructors) {
      if (!c.indyOnly && c.nationality && !seen.has(c.nationality)) {
        seen.add(c.nationality);
        list.push(c.nationality);
      }
    }
    return list.sort();
  }, [constructors]);

  const filtered = constructors
    .filter((c) => showIndy || !c.indyOnly)
    .filter((c) => !currentOnly || c.current)
    .filter((c) => !nationalityFilter || c.nationality === nationalityFilter);

  const sorted = [...filtered].sort((a, b) => {
    let cmp: number;
    if (sortCol === "name") {
      cmp = (a.name ?? "").localeCompare(b.name ?? "");
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

  const currentCount = constructors.filter((c) => c.current).length;
  const indyCount = constructors.filter((c) => c.indyOnly).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-zinc-500 text-sm">{sorted.length.toLocaleString()} constructors</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={nationalityFilter}
            onChange={(e) => setNationalityFilter(e.target.value)}
            className="text-xs bg-zinc-900 border border-zinc-700 text-zinc-400 rounded-lg px-3 py-1.5 hover:border-zinc-500 hover:text-white transition-colors focus:outline-none focus:border-zinc-500"
          >
            <option value="">All nationalities</option>
            {nationalities.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <Toggle active={currentOnly} onClick={() => setCurrentOnly((v) => !v)}>
            Current only ({currentCount})
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
              <Th col="name" label="Constructor" />
              <Th col="nationality" label="Nat" />
              <Th col="firstSeason" label="First" right />
              <Th col="lastSeason" label="Last" right />
              <Th col="races" label="Races" right />
              <Th col="wins" label="Wins" right />
              <Th col="podiums" label="Podiums" right />
              <Th col="poles" label="Poles" right />
              <Th col="points" label="Points" right />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-900/60 transition-colors">
                <td className="py-2.5 text-amber-400 text-right font-mono text-xs pr-2 leading-tight">
                  {c.championships > 4 ? (
                    <span className="inline-flex flex-col items-end">
                      <span>{"★".repeat(Math.ceil(c.championships / 2))}</span>
                      <span>{"★".repeat(Math.floor(c.championships / 2))}</span>
                    </span>
                  ) : c.championships > 0 ? "★".repeat(c.championships) : ""}
                </td>
                <td className="py-2.5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/constructors/${c.id}/`} className="text-white font-medium hover:text-red-400 transition-colors">
                        {c.name}
                      </Link>
                      {!!c.current && (
                        <span className="text-xs bg-green-900/50 text-green-400 border border-green-700/40 px-1.5 py-0.5 rounded">Current</span>
                      )}
                      {!!c.indyOnly && (
                        <span className="text-xs bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">Indy</span>
                      )}
                    </div>
                    {c.name !== c.shortName && c.shortName && (
                      <span className="text-zinc-600 text-xs">{c.shortName}</span>
                    )}
                  </div>
                </td>
                <td className="py-2.5">
                  {c.nationalityCode ? (
                    <span
                      className={`fi fi-${c.nationalityCode.toLowerCase()} fis`}
                      title={c.nationality}
                      style={{ fontSize: "1.25rem" }}
                    />
                  ) : (
                    <span className="text-zinc-500">{c.nationality ?? "—"}</span>
                  )}
                </td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{c.firstSeason}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{c.lastSeason}</td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{c.races}</td>
                <td className="py-2.5 text-right font-mono">
                  <span className={Number(c.wins) > 0 ? "text-white font-semibold" : "text-zinc-500"}>{fmt(c.wins)}</span>
                </td>
                <td className="py-2.5 text-zinc-300 text-right font-mono">{fmt(c.podiums)}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{fmt(c.poles)}</td>
                <td className="py-2.5 text-zinc-400 text-right font-mono">{fmt(c.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
