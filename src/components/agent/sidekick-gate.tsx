import { isFlagEnabled } from "@/lib/feature-flags";
import { SidekickDrawer } from "./sidekick-drawer";

/**
 * Server Component that checks the feature flag at request time.
 * Must be rendered inside a <Suspense> boundary so that the cookies()
 * call (dynamic data) does not block the static shell prerender.
 */
export async function SidekickGate() {
  const sidekickOn = await isFlagEnabled("feature.sidekick");
  if (!sidekickOn) return null;
  return <SidekickDrawer />;
}
