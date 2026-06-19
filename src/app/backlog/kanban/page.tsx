import Link from "next/link";
import { sections, done } from "../tasks";

export const metadata = { title: "Kanban — KiwiF1" };

const complexityColour: Record<string, string> = {
  S:  "text-green-400 bg-green-400/10 border-green-400/20",
  M:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  L:  "text-orange-400 bg-orange-400/10 border-orange-400/20",
  XL: "text-red-400 bg-red-400/10 border-red-400/20",
};

const sectionColour: Record<string, string> = {
  Drivers:      "text-blue-400",
  Constructors: "text-purple-400",
  Seasons:      "text-teal-400",
  Records:      "text-yellow-400",
  Site:         "text-zinc-400",
};

const allPending = sections.flatMap((s) =>
  s.tasks.filter((t) => t.status === "pending").map((t) => ({ ...t, section: s.label }))
);

const columns = [
  {
    label: "Planned",
    colour: "border-zinc-700",
    headerColour: "text-zinc-400",
    tasks: allPending,
  },
  {
    label: "In Progress",
    colour: "border-blue-700",
    headerColour: "text-blue-400",
    tasks: [] as typeof allPending,
  },
  {
    label: "Done",
    colour: "border-green-800",
    headerColour: "text-green-400",
    tasks: done.map((d) => ({ ...d, complexity: "S" as const, description: "", status: "done" as const, section: "" })),
  },
];

export default function KanbanPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-2">
        <p className="text-red-500 text-xs font-semibold tracking-widest uppercase">KiwiF1</p>
        <Link href="/backlog/" className="text-zinc-500 hover:text-white text-xs transition-colors">
          ← List view
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-white mb-10">Backlog Kanban</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {columns.map((col) => (
          <div key={col.label} className={`bg-zinc-900 border ${col.colour} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-bold uppercase tracking-wider ${col.headerColour}`}>{col.label}</h2>
              <span className="text-zinc-600 text-xs font-mono">{col.tasks.length}</span>
            </div>
            <div className="space-y-3">
              {col.tasks.length === 0 && (
                <p className="text-zinc-700 text-xs text-center py-6">Nothing here yet</p>
              )}
              {col.tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-zinc-500 text-xs font-mono">{task.id}</span>
                    {"complexity" in task && task.complexity && (
                      <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded border ${complexityColour[task.complexity]}`}>
                        {task.complexity}
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm font-medium leading-snug">{task.title}</p>
                  {"section" in task && task.section && (
                    <p className={`text-xs mt-1.5 font-medium ${sectionColour[task.section] ?? "text-zinc-500"}`}>
                      {task.section}
                    </p>
                  )}
                  {"version" in task && task.version && (
                    <p className="text-zinc-600 text-xs mt-1 font-mono">{task.version}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
