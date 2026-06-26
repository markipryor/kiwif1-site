import { getAllConstructors, getAllConstructorChampionships } from "@/lib/queries";
import ConstructorsTable from "./ConstructorsTable";

export const metadata = { title: "Constructors — KiwiF1" };

export default async function ConstructorsPage() {
  const [constructors, championships] = await Promise.all([
    getAllConstructors(),
    getAllConstructorChampionships(),
  ]);

  const champMap = new Map(championships.map((c) => [c.constructorId, c.championships]));

  const rows = constructors.map((c) => ({
    ...c,
    championships: champMap.get(c.id) ?? 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">Formula 1</p>
      <h1 className="text-3xl font-bold text-white mb-8">All Constructors</h1>
      <ConstructorsTable constructors={rows} />
    </div>
  );
}
