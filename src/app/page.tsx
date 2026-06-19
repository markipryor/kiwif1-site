import Link from "next/link";
import { query } from "@/lib/db";

export default async function Home() {
  const [counts] = await query<{ drivers: number; constructors: number; races: number; seasons: number }>(`
    SELECT
      (SELECT COUNT(DISTINCT driver_id) FROM results) AS drivers,
      (SELECT COUNT(DISTINCT constructor_id) FROM entrants e JOIN results r ON r.entrant_id = e.id) AS constructors,
      (SELECT COUNT(*) FROM grandsprix) AS races,
      (SELECT COUNT(DISTINCT YEAR(date)) FROM grandsprix) AS seasons
  `);

  const { drivers, constructors, races, seasons } = counts;

  const sections = [
    {
      href: "/drivers/",
      label: "Drivers",
      desc: "Career stats, season-by-season breakdown and teammate comparisons for every driver.",
      stat: `${drivers} drivers`,
      colour: "border-blue-700/40 hover:border-blue-600/60",
      accent: "text-blue-400",
    },
    {
      href: "/constructors/",
      label: "Constructors",
      desc: "Every constructor from 1950 to the present, with wins, points and season histories.",
      stat: `${constructors} constructors`,
      colour: "border-orange-700/40 hover:border-orange-600/60",
      accent: "text-orange-400",
    },
    {
      href: "/seasons/",
      label: "Seasons",
      desc: "Full standings and race calendar for every championship from 1950 to 2026.",
      stat: `${seasons} seasons`,
      colour: "border-green-700/40 hover:border-green-600/60",
      accent: "text-green-400",
    },
    {
      href: "/records/",
      label: "Records",
      desc: "All-time leaders for wins, podiums, poles, fastest laps, points and starts.",
      stat: `${races} races`,
      colour: "border-red-700/40 hover:border-red-600/60",
      accent: "text-red-400",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-24">
      <div className="mb-16">
        <p className="text-red-500 text-sm font-medium tracking-widest uppercase mb-3">Formula 1</p>
        <h1 className="text-5xl font-bold text-white mb-4">KiwiF1 Statistics</h1>
        <p className="text-zinc-400 text-lg max-w-xl">
          Historical F1 data from 1950 to the present — {Number(races).toLocaleString()} races,{" "}
          {Number(drivers).toLocaleString()} drivers, {Number(constructors)} constructors.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`bg-zinc-900 border rounded-xl p-6 transition-colors ${s.colour}`}
          >
            <p className={`text-xs font-semibold tracking-widest uppercase mb-1 ${s.accent}`}>{s.stat}</p>
            <h2 className="text-xl font-bold text-white mb-2">{s.label}</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
