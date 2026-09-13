import { chromium } from "playwright";
import { join } from "node:path";
import { prisma } from "../src/lib/db";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "public", "presentation");
const VIEWPORT = { width: 1600, height: 1000 };

async function main() {
  const annonce = await prisma.annonce.findFirst({
    where: { statut: "ouvert" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!annonce) {
    console.warn("⚠️ Aucune annonce ouverte trouvée");
    await prisma["$disconnect"]();
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/annonces/${annonce.id}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const filePath = join(OUT_DIR, "06-detail-annonce.png");
    await page.screenshot({
      path: filePath,
      fullPage: false,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
    console.log(`✅ Capture 06-detail-annonce.png`);
  } catch (e) {
    console.error("❌ Erreur :", e);
  } finally {
    await browser.close();
    await prisma["$disconnect"]();
  }
}

main();
