import { chromium, Browser, Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "public", "presentation");

// Viewport large et cohérent pour toutes les captures.
const VIEWPORT = { width: 1600, height: 1000 };
const HEADER_HEIGHT = 72;

async function ensureDir() {
  await mkdir(OUT_DIR, { recursive: true });
}

async function capture(
  page: Page,
  path: string,
  name: string,
  options?: {
    waitFor?: string;
    scrollTo?: string;
    scrollOffset?: number;
    waitExtra?: number;
  },
) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  await page.goto(url, { waitUntil: "networkidle" });

  if (options?.waitFor) {
    await page
      .waitForSelector(options.waitFor, { state: "visible", timeout: 5000 })
      .catch(() => {});
  }

  // Remettre le scroll en haut par défaut.
  await page.evaluate(() => window.scrollTo(0, 0));

  // Scroll ciblé si demandé (ex. section de résultats), en laissant le header dégagé.
  if (options?.scrollTo) {
    await page.locator(options.scrollTo).first().scrollIntoViewIfNeeded();
    await page.evaluate((offset) => window.scrollBy(0, offset), -(options.scrollOffset ?? HEADER_HEIGHT));
  }

  // Capture exactement la taille du viewport (pas fullPage) pour uniformiser.
  await page.waitForTimeout(options?.waitExtra ?? 800);
  const filePath = join(OUT_DIR, name);
  await page.screenshot({
    path: filePath,
    fullPage: false,
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
  });
  console.log(`✅ Capture ${name}`);
  return filePath;
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/(\/dashboard|\/admin)/, { timeout: 10_000 });
  console.log("✅ Connecté");
}

async function getFirstHref(page: Page, selector: string) {
  const loc = page.locator(selector).first();
  const count = await loc.count();
  return count > 0 ? loc.getAttribute("href") : Promise.resolve(null);
}

async function main() {
  await ensureDir();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    // Pages publiques
    await capture(page, "/", "01-accueil.png");
    await capture(page, "/inscription", "02-inscription.png");

    // Recherche de match : scroll jusqu'aux résultats, capture propre sans header en plein milieu.
    await capture(page, "/annonces?categorie=Seniors", "05-recherche-match.png", {
      waitFor: "#annonces-results",
      scrollTo: "#annonces-results",
      scrollOffset: 100,
    });

    // Détail d'une annonce
    const annonceHref = await getFirstHref(page, 'a[href^="/annonces/"]');
    if (annonceHref) {
      await capture(page, annonceHref, "06-detail-annonce.png");
    } else {
      console.warn("⚠️ Aucun lien d'annonce trouvé");
    }

    // Liste des clubs avec résultats
    await capture(page, "/clubs?categorie=Seniors", "07-clubs.png");

    // Détail d'un club
    const clubHref = await getFirstHref(page, 'a[href^="/clubs/"]');
    if (clubHref) {
      await capture(page, clubHref, "08-detail-club.png");
    } else {
      console.warn("⚠️ Aucun lien de club trouvé");
    }

    // Connexion compte démo pour pages privées
    await login(page, "contact@aslyonfoot.fr", "club1234");

    // Dashboard
    await capture(page, "/dashboard", "03-dashboard.png");

    // Nouvelle annonce
    await capture(page, "/dashboard/annonces/nouvelle", "04-nouvelle-annonce.png");

    console.log("\n🎉 Toutes les captures sont dans", OUT_DIR);
    console.log(`   Résolution uniforme : ${VIEWPORT.width}x${VIEWPORT.height}`);
  } catch (e) {
    console.error("❌ Erreur capture :", e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
