import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const SHOTS = "screenshots";
mkdirSync(SHOTS, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  // Set the feature-flag cookie before any navigation so the first paint sees it.
  await context.addCookies([
    {
      name: "ff",
      value: "dashboard.v2=1,feature.briefing=1,feature.sidekick=1,feature.simulator=1",
      domain: "localhost",
      path: "/",
    },
  ]);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("console.error:", msg.text());
  });

  console.log("→ /grades (Phase 3 SimulatorPanel)");
  await page.goto(`${BASE}/grades`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/p3-grades.png`, fullPage: true });

  console.log("→ /grades  Targets tab");
  // Click the "Targets" tab
  const targetsTab = page.getByRole("tab", { name: /targets/i });
  if (await targetsTab.count()) {
    await targetsTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/p3-targets.png`, fullPage: true });
  }

  console.log("→ /grades  Bands tab");
  const bandsTab = page.getByRole("tab", { name: /bands/i });
  if (await bandsTab.count()) {
    await bandsTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/p3-bands.png`, fullPage: true });
  }

  console.log("→ / (Phase 1 briefing + Phase 2 sidekick)");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  // Briefing call to Vertex Pro takes a few seconds the first time.
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `${SHOTS}/dashboard-v2.png`, fullPage: true });

  console.log("→ open Sidekick drawer");
  // Try the explicit Sidekick button in the top bar.
  const sidekickBtn = page.getByRole("button", { name: /sidekick/i });
  if (await sidekickBtn.count()) {
    await sidekickBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/sidekick-open.png`, fullPage: true });
  }

  await browser.close();
  console.log("done — screenshots in screenshots/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
