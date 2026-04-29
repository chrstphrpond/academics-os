import { cookies } from "next/headers";

export type FeatureFlag =
  | "dashboard.v2"
  | "feature.briefing"
  | "feature.sidekick"
  | "feature.simulator"
  | "feature.planner"
  | "feature.radar"
  | "feature.rag"
  | "feature.study"
  | "feature.inbox"
  | "feature.voice";

export async function isFlagEnabled(flag: FeatureFlag): Promise<boolean> {
  const store = await cookies();
  const raw = store.get("ff")?.value ?? "";
  // Accept both `,` and `;` as separators; `;` is awkward to set via
  // `document.cookie` (it's the attribute delimiter), so prefer `,` in docs.
  for (const entry of raw.split(/[,;]/)) {
    const [name, value] = entry.split("=");
    if (name?.trim() === flag && value?.trim() === "1") return true;
  }
  return false;
}
