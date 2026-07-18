import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecords, getConsecutiveRecords, getOtherRecords } from "@/lib/queries";
import type { ConsecRow } from "@/lib/queries";
import PointsTable from "../PointsTable";
import type { PointsRow } from "../RecordsClient";

type RecordRow = { driverId: number; name: string; value: number; current?: number };

const MOST_CATEGORIES = {
  wins:           { label: "Most Wins",           key: "wins"        as const, consecutive: false },
  podiums:        { label: "Most Podiums",         key: "podiums"     as const, consecutive: false },
  poles:          { label: "Most Pole Positions",  key: "poles"       as const, consecutive: false },
  "fastest-laps": { label: "Most Fastest Laps",    key: "fastestLaps" as const, consecutive: false },
  points:         { label: "Most Points",          key: "points"      as const, consecutive: false },
  "race-starts":  { label: "Most Race Starts",     key: "races"       as const, consecutive: false },
};

const CONS_CATEGORIES = {
  "cons-wins":         { label: "Consecutive Wins",            key: "wins"        as const, consecutive: true },
  "cons-podiums":      { label: "Consecutive Podiums",         key: "podiums"     as const, consecutive: true },
  "cons-poles":        { label: "Consecutive Pole Positions",  key: "poles"       as const, consecutive: true },
  "cons-fastest-laps": { label: "Consecutive Fastest Laps",    key: "fastestLaps" as const, consecutive: true },
  "cons-points":       { label: "Consecutive Points Finishes", key: "points"      as const, consecutive: true },
  "cons-finishes":     { label: "Consecutive Finishes",        key: "finishes"    as const, consecutive: true },
  "cons-starts":       { label: "Consecutive Race Starts",     key: "starts"      as const, consecutive: true },
};

const OTHER_CATEGORIES = {
  "hat-tricks":           { label: "Most Hat-Tricks (Win, Pole & Fastest Lap)",    key: "hatTricks"           as const, consecutive: false, other: true },
  "wins-from-pole":       { label: "Most Wins from Pole Position",                 key: "winsFromPole"        as const, consecutive: false, other: true },
  "wins-from-non-pole":   { label: "Most Wins from Non-Pole",                      key: "winsFromNonPole"     as const, consecutive: false, other: true },
  "podiums-without-win":  { label: "Most Podiums Without a Win",                   key: "podiumsWithoutWin"   as const, consecutive: false, other: true },
  "starts-without-win":   { label: "Most Starts Without a Win",                    key: "startsWithoutWin"    as const, consecutive: false, other: true },
  "starts-without-points":{ label: "Most Starts Without Scoring a Point",          key: "startsWithoutPoints" as const, consecutive: false, other: true },
  "most-dnfs":            { label: "Most DNFs",                                    key: "dnfs"                as const, consecutive: false, other: true },
  "constructors-raced-for":{ label: "Most Constructors Raced For",                 key: "constructorsRacedFor" as const, consecutive: false, other: true },
  "lowest-grid-win":      { label: "Lowest Starting Position for a Race Win",      key: "lowestGridWin"       as const, consecutive: false, other: true },
};

const ALL_CATEGORIES = { ...MOST_CATEGORIES, ...CONS_CATEGORIES, ...OTHER_CATEGORIES };

export function generateStaticParams() {
  return Object.keys(ALL_CATEGORIES).map(category => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = ALL_CATEGORIES[category as keyof typeof ALL_CATEGORIES];
  return { title: `${cat?.label ?? "Records"} — KiwiF1` };
}

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

function DriverRowItem({ rank, row, max, consecutive }: {
  rank: string; row: RecordRow | ConsecRow; max: number; consecutive: boolean;
}) {
  const cr = consecutive ? (row as ConsecRow) : null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4">
      <span className="text-zinc-500 text-sm w-8 text-right font-mono shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/drivers/${row.driverId}/`} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">
            {row.name}
          </Link>
          {!!row.current && (
            <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-medium">Current</span>
          )}
          {cr && !!cr.isOngoing && (
            <span className="text-xs bg-green-900 text-green-300 px-1.5 py-0.5 rounded font-medium">Ongoing</span>
          )}
        </div>
        {cr && (
          <p className="text-zinc-500 text-xs mt-0.5">{cr.startGp} – {cr.endGp}</p>
        )}
        <div className="w-full bg-zinc-800 rounded-full h-1 mt-2">
          <div className="h-1 rounded-full bg-red-500" style={{ width: `${(Number(row.value) / max) * 100}%` }} />
        </div>
      </div>
      <span className="text-white font-bold text-base w-14 text-right shrink-0">{fmt(row.value)}</span>
    </div>
  );
}

export default async function RecordCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = ALL_CATEGORIES[category as keyof typeof ALL_CATEGORIES];
  if (!cat) notFound();

  let rows: (RecordRow | ConsecRow)[];
  let pointsRows: PointsRow[] | null = null;

  if ("other" in cat && cat.other) {
    const otherRecords = await getOtherRecords();
    rows = otherRecords[cat.key as keyof typeof otherRecords] as RecordRow[];
  } else if (cat.consecutive) {
    const consRecords = await getConsecutiveRecords();
    rows = consRecords[cat.key as keyof typeof consRecords] as ConsecRow[];
  } else {
    const records = await getRecords();
    rows = records[cat.key as keyof typeof records] as RecordRow[];
    if (category === "points") pointsRows = records.points;
  }

  const max = Number(rows[0]?.value ?? 1);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Link href="/records/" className="text-zinc-500 hover:text-white text-sm transition-colors">
          ← All-Time Records
        </Link>
        <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mt-6 mb-2">Formula 1</p>
        <h1 className="text-3xl font-bold text-white">{cat.label}</h1>
        <p className="text-zinc-500 text-sm mt-1">{rows.length} driver{rows.length !== 1 ? "s" : ""}</p>
      </div>

      {pointsRows ? (
        <PointsTable rows={pointsRows} showTitle={false} />
      ) : (
        <div className="space-y-2">
          {(() => {
            const rankStrings = computeRanks(rows);
            return rows.map((r, i) => (
              <DriverRowItem key={r.driverId} rank={rankStrings[i]} row={r} max={max} consecutive={cat.consecutive} />
            ));
          })()}
        </div>
      )}
    </div>
  );
}
