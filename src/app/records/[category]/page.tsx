import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecords, getConsecutiveRecords } from "@/lib/queries";
import PointsTable from "../PointsTable";
import type { PointsRow } from "../RecordsClient";

type RecordRow = { driverId: number; name: string; value: number };

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

const ALL_CATEGORIES = { ...MOST_CATEGORIES, ...CONS_CATEGORIES };

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

function RowItem({ rank, driverId, name, value, max }: {
  rank: number; driverId: number; name: string; value: number; max: number;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4">
      <span className="text-zinc-500 text-sm w-6 text-right font-mono shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <Link href={`/drivers/${driverId}/`} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">
          {name}
        </Link>
        <div className="w-full bg-zinc-800 rounded-full h-1 mt-2">
          <div className="h-1 rounded-full bg-red-500" style={{ width: `${(value / max) * 100}%` }} />
        </div>
      </div>
      <span className="text-white font-bold text-base w-14 text-right shrink-0">{fmt(value)}</span>
    </div>
  );
}

export default async function RecordCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = ALL_CATEGORIES[category as keyof typeof ALL_CATEGORIES];
  if (!cat) notFound();

  let rows: RecordRow[];
  let pointsRows: PointsRow[] | null = null;

  if (cat.consecutive) {
    const consRecords = await getConsecutiveRecords();
    rows = consRecords[cat.key as keyof typeof consRecords] as RecordRow[];
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
          {rows.map((r, i) => (
            <RowItem key={r.driverId} rank={i + 1} driverId={r.driverId} name={r.name} value={Number(r.value)} max={max} />
          ))}
        </div>
      )}
    </div>
  );
}
