// Playwright verification crawl: logs in as admin and rep, visits every nav route,
// fails (exit 1) on any pageerror, console error, or "Application error" body text.
// Usage: CRAWL_BASE=http://localhost:3111 node scripts/crawl.mjs
import { chromium } from "playwright";

const BASE = process.env.CRAWL_BASE || "http://localhost:3000";
const PASSWORD = "ChangeMe123!";
const REP_ROUTES = ["/dashboard", "/order", "/quotes", "/quotes/new", "/customers", "/products", "/invoices", "/account"];
const ADMIN_ROUTES = [...REP_ROUTES, "/pricing", "/reps", "/reports", "/settings"];
const USERS = [
  { label: "admin", email: "uniquesalesinc@gmail.com", routes: ADMIN_ROUTES },
  { label: "rep", email: "spencer@demo.lapeptides.net", routes: REP_ROUTES },
];

const failures = [];

async function crawlUser(browser, { label, email, routes }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });

  // Wait for hydration before submitting, or React's onSubmit handler is not attached yet
  // and the form falls back to a native GET submit.
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  async function visit(route) {
    errors.length = 0;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(800); // let client components hydrate and settle
      const body = (await page.textContent("body")) || "";
      if (body.includes("Application error")) errors.push('body: contains "Application error"');
    } catch (err) {
      errors.push(`navigation: ${err.message}`);
    }
    if (errors.length) {
      failures.push({ label, route, errors: [...errors] });
      console.log(`FAIL [${label}] ${route}`);
      for (const e of errors) console.log(`     ${e}`);
    } else {
      console.log(`ok   [${label}] ${route}`);
    }
  }

  for (const route of routes) await visit(route);

  // Representative product detail page: the first detail link found on /products.
  await page.goto(`${BASE}/products`, { waitUntil: "load", timeout: 30000 });
  const detailHref = await page.$$eval('a[href^="/products/"]', (anchors) =>
    anchors.map((a) => a.getAttribute("href")).find((h) => h && h !== "/products")
  );
  if (detailHref) {
    await visit(detailHref);
  } else {
    failures.push({ label, route: "/products/[id]", errors: ["no product detail link found on /products"] });
    console.log(`FAIL [${label}] /products/[id] (no detail link found)`);
  }

  await context.close();
}

const browser = await chromium.launch();
try {
  for (const user of USERS) await crawlUser(browser, user);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} page visit(s) had errors.`);
  process.exit(1);
}
console.log("\nAll pages clean.");
