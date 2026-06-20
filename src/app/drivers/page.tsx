import { getAllDrivers, getAllChampionships } from "@/lib/queries";
import DriversTable from "./DriversTable";

export const metadata = { title: "Drivers — KiwiF1" };

export default async function DriversPage() {
  const [raw, champRows] = await Promise.all([getAllDrivers(), getAllChampionships()]);
  const champMap = new Map(champRows.map((c) => [c.driverId, Number(c.championships)]));

  const drivers = raw.map((d) => ({
    id: d.id,
    firstName: d.firstName,
    surname: d.surname,
    nationality: d.nationality,
    nationalityCode: d.nationalityCode,
    indyOnly: Boolean(d.indyOnly),
    current: Boolean(d.current),
    championships: champMap.get(d.id) ?? 0,
    seasons: d.seasons,
    races: d.races,
    wins: d.wins,
    podiums: d.podiums,
    poles: d.poles,
    fastestLaps: d.fastestLaps,
    points: d.points,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">Formula 1</p>
      <h1 className="text-3xl font-bold text-white mb-8">All Drivers</h1>
      <DriversTable drivers={drivers} />
    </div>
  );
}
