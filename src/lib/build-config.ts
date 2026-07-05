import fs from "fs";
import path from "path";

export type SectionSpec = "all" | number[] | "current-pairs";

export interface BuildConfig {
  mode: string;
  drivers?: SectionSpec;
  constructors?: SectionSpec;
  seasons?: SectionSpec;
  races?: SectionSpec;
  comparisons?: SectionSpec;
}

let _loaded = false;
let _config: BuildConfig | null = null;

export function getBuildConfig(): BuildConfig | null {
  if (_loaded) return _config;
  _loaded = true;
  const f = path.join(/* turbopackIgnore: true */ process.cwd(), ".build-config.json");
  if (fs.existsSync(f)) {
    const raw: BuildConfig = JSON.parse(fs.readFileSync(f, "utf8"));
    // In backlog mode, clear all section specs so generateStaticParams falls through
    // to seed files — generates exactly 1 page per section for CSS-ref extraction only.
    _config = raw.mode === "backlog" ? { mode: "backlog" } : raw;
  }
  return _config;
}

// Reads seed ID written by prebuild for passive sections (CSS-ref patching).
export function getSeed(flagFile: string): string | null {
  const p = path.join(/* turbopackIgnore: true */ process.cwd(), flagFile);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8").trim() || null : null;
}
