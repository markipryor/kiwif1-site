import Link from "next/link";

const links = [
  { href: "/drivers/", label: "Drivers" },
  { href: "/constructors/", label: "Constructors" },
  { href: "/seasons/", label: "Seasons" },
  { href: "/records/", label: "Records" },
  { href: "/backlog/", label: "Updates" },
];

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-red-500 font-bold text-lg tracking-tight">Kiwi</span>
          <span className="text-white font-bold text-lg tracking-tight">F1</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-zinc-800"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
