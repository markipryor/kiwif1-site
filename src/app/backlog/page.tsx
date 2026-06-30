import Link from "next/link";
import { sections, deployed, done, deployedTasks } from "./tasks";

export const metadata = { title: "Upcoming Features — KiwiF1" };

const complexityColour: Record<string, string> = {
  S:  "text-green-400 bg-green-400/10",
  M:  "text-yellow-400 bg-yellow-400/10",
  L:  "text-orange-400 bg-orange-400/10",
  XL: "text-red-400 bg-red-400/10",
};

export default function BacklogPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4 mb-2">
        <p className="text-red-500 text-xs font-semibold tracking-widest uppercase">KiwiF1</p>
        <Link
          href="/backlog/kanban/"
          className="text-zinc-500 hover:text-white text-xs transition-colors"
        >
          View as Kanban →
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Upcoming Features</h1>
      <p className="text-zinc-500 text-sm mb-10">
        Planned improvements to the site. Complexity: S = a session or two · M = several sessions · L = weeks · XL = major milestone.
      </p>

      {sections.map((section) => {
        const pending = section.tasks.filter((t) => t.status === "pending");
        if (pending.length === 0) return null;
        return (
          <div key={section.label} className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-4">{section.label}</h2>
            <div className="space-y-3">
              {pending.map((task) => (
                <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-zinc-600 text-xs font-mono">{task.id}</span>
                        <span className="text-white font-semibold text-sm">{task.title}</span>
                      </div>
                      <p className="text-zinc-500 text-xs leading-relaxed">{task.description}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${complexityColour[task.complexity]}`}>
                      {task.complexity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {deployedTasks.length > 0 && (
        <div className="mt-10 pt-8 border-t border-amber-800/40">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-4">
            Deployed — awaiting confirmation
          </h2>
          <div className="space-y-3">
            {deployedTasks.map((task) => (
              <div key={task.id} className="bg-zinc-900 border border-amber-700/30 rounded-lg px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-zinc-600 text-xs font-mono">{task.id}</span>
                      <span className="text-white font-semibold text-sm">{task.title}</span>
                      <span className="text-amber-500 text-xs bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">⏳ deployed</span>
                    </div>
                    <p className="text-zinc-500 text-xs leading-relaxed">{task.description}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${complexityColour[task.complexity]}`}>
                    {task.complexity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-6">Deployed Features</h2>
        <div className="space-y-6">
          {deployed.map((v) => (
            <div key={v.version}>
              <h3 className="text-sm font-mono font-semibold text-white mb-2">{v.version}</h3>
              <ul className="space-y-1">
                {v.changes.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-xs text-zinc-400">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
