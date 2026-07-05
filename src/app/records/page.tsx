import { getRecords, getAgeRecords, getConsecutiveRecords } from "@/lib/queries";
import RecordsClient from "./RecordsClient";

export const metadata = { title: "All-Time Records — KiwiF1" };

export default async function RecordsPage() {
  const [{ wins, podiums, poles, fastestLaps, points, races }, ageRecords, consecutive] = await Promise.all([
    getRecords(),
    getAgeRecords(),
    getConsecutiveRecords(),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">Formula 1</p>
      <h1 className="text-3xl font-bold text-white mb-10">All-Time Records</h1>
      <RecordsClient data={{ wins, podiums, poles, fastestLaps, points, races }} ageRecords={ageRecords} consecutive={consecutive} />
    </div>
  );
}
