// Playwright verification crawl: logs in as admin, rep, and a store portal user, visits
// every nav route, fails (exit 1) on any pageerror, console error, or "Application error"
// body text. Also asserts cross-surface isolation: the client cookie never opens the staff
// portal and a staff session never opens the client account area.
// Usage: CRAWL_BASE=http://localhost:3111 node scripts/crawl.mjs
import { chromium } from "playwright";

const BASE = process.env.CRAWL_BASE || "http://localhost:3000";
const PASSWORD = "ChangeMe123!";
const REP_ROUTES = [
  "/dashboard",
  "/dashboard/sales",
  "/dashboard/engagement",
  "/dashboard/tasks",
  "/order",
  "/quotes",
  "/quotes/new",
  "/customers",
  "/products",
  "/invoices",
  "/account",
];
const ADMIN_ROUTES = [
  ...REP_ROUTES,
  "/dashboard/leads",
  "/customers/portal-users",
  "/pricing",
  "/reps",
  "/reports",
  "/reports/customers",
  "/reports/products",
  "/reports/team",
  "/settings",
];
const USERS = [
  { label: "admin", email: "uniquesalesinc@gmail.com", routes: ADMIN_ROUTES },
  // rep1 (not spencer): the rep crawl must reach a customer detail page, and rep1 is the
  // demo rep that owns a customer.
  { label: "rep", email: "rep1@demo.lapeptides.net", routes: REP_ROUTES },
];

const failures = [];

async function crawlUser(browser, { label, email, routes }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    // Benign by design: when a link prefetch's RSC fetch is dropped (remote target, flaky
    // network, or a navigation racing the prefetch), Next logs this and recovers with a full
    // browser navigation. The page still renders; only this exact recovery notice is ignored.
    if (msg.text().startsWith("Failed to fetch RSC payload")) return;
    errors.push(`console: ${msg.text()}`);
  });

  // Wait for hydration before submitting, or React's onSubmit handler is not attached yet
  // and the form falls back to a native GET submit.
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await settleNetwork();

  // Let in-flight link prefetches finish before the next goto. Against a remote target
  // (CRAWL_BASE on Vercel) a navigation would otherwise abort the previous page's RSC
  // prefetch burst mid-flight, and Next logs "Failed to fetch RSC payload" console errors
  // that are attribution noise, not app failures. Instant no-op on localhost.
  async function settleNetwork() {
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  }

  async function visit(route) {
    errors.length = 0;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(800); // let client components hydrate and settle
      const body = (await page.textContent("body")) || "";
      if (body.includes("Application error")) errors.push('body: contains "Application error"');
      await settleNetwork();
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

  // Admin-only routes: a rep hitting them must be redirected away (requireAdmin).
  if (label === "rep") {
    for (const adminRoute of ["/dashboard/leads", "/reports", "/customers/portal-users"]) {
      await page.goto(`${BASE}${adminRoute}`, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(500);
      await settleNetwork();
      const landed = new URL(page.url()).pathname;
      if (landed === adminRoute) {
        failures.push({ label, route: adminRoute, errors: [`rep was NOT redirected off admin route ${adminRoute}`] });
        console.log(`FAIL [${label}] ${adminRoute} (no redirect for rep)`);
      } else {
        console.log(`ok   [${label}] ${adminRoute} redirected rep to ${landed}`);
      }
    }
  }

  // Representative customer detail page (Customer 360): first customer link on /customers.
  await page.goto(`${BASE}/customers`, { waitUntil: "load", timeout: 30000 });
  await settleNetwork();
  const customerHref = await page.$$eval('a[href^="/customers/"]', (anchors) =>
    anchors
      .map((a) => a.getAttribute("href"))
      .find(
        (h) =>
          h && h !== "/customers" && h !== "/customers/new" && h !== "/customers/portal-users" && !h.endsWith("/edit")
      )
  );
  if (customerHref) {
    await visit(customerHref);
  } else {
    failures.push({ label, route: "/customers/[id]", errors: ["no customer detail link found on /customers"] });
    console.log(`FAIL [${label}] /customers/[id] (no detail link found)`);
  }

  // Representative product detail page: the first detail link found on /products.
  await page.goto(`${BASE}/products`, { waitUntil: "load", timeout: 30000 });
  await settleNetwork();
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

// ---------------------------------------------------------------------------
// STORE persona: the client portal surface. Separate auth world (lap_client_session
// cookie, not NextAuth), so it gets its own crawl functions instead of a USERS entry.
// ---------------------------------------------------------------------------
const STORE_EMAIL = "test-portal-user@demo.lapeptides.net";

function watchErrors(page, errors) {
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    if (msg.text().startsWith("Failed to fetch RSC payload")) return;
    errors.push(`console: ${msg.text()}`);
  });
}

function report(label, route, errors) {
  if (errors.length) {
    failures.push({ label, route, errors: [...errors] });
    console.log(`FAIL [${label}] ${route}`);
    for (const e of errors) console.log(`     ${e}`);
  } else {
    console.log(`ok   [${label}] ${route}`);
  }
}

async function crawlStore(browser) {
  const label = "store";
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  watchErrors(page, errors);

  const settleNetwork = () =>
    page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  async function visit(route, opts = {}) {
    errors.length = 0;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(800);
      const body = (await page.textContent("body")) || "";
      if (body.includes("Application error")) errors.push('body: contains "Application error"');
      await settleNetwork();
      if (opts.allowRedirectTo) {
        const landed = new URL(page.url()).pathname;
        if (landed !== route && landed !== opts.allowRedirectTo) {
          errors.push(`landed on unexpected path ${landed}`);
        }
      }
    } catch (err) {
      errors.push(`navigation: ${err.message}`);
    }
    report(label, route, errors);
  }

  // Client login (hydration wait mirrors the staff login above).
  await page.goto(`${BASE}/store/login`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);
  await page.fill("#email", STORE_EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/store/account", { timeout: 30000 });
  await settleNetwork();

  await visit("/store");

  // Representative product detail page: first product link in the store grid.
  const productHref = await page.$$eval('a[href^="/store/products/"]', (anchors) =>
    anchors.map((a) => a.getAttribute("href")).find(Boolean)
  );
  if (productHref) {
    await visit(productHref);
  } else {
    failures.push({ label, route: "/store/products/[id]", errors: ["no product link found on /store"] });
    console.log(`FAIL [${label}] /store/products/[id] (no product link found)`);
  }

  await visit("/store/cart");
  // An empty (or under-minimum) cart legitimately bounces checkout back to the cart;
  // following that redirect without error text counts as a pass.
  await visit("/store/checkout", { allowRedirectTo: "/store/cart" });
  await visit("/store/account");
  await visit("/store/account/brand");

  // Cross-surface isolation: the client cookie must NOT open the staff portal. The
  // middleware never consults it outside /store, so /dashboard must 307 to staff /login.
  await page.goto(`${BASE}/dashboard`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(500);
  await settleNetwork();
  const staffLanded = new URL(page.url()).pathname;
  if (staffLanded === "/login") {
    console.log(`ok   [${label}] /dashboard redirected client cookie to ${staffLanded}`);
  } else {
    failures.push({ label, route: "/dashboard", errors: [`client cookie was NOT redirected to staff login (landed ${staffLanded})`] });
    console.log(`FAIL [${label}] /dashboard (client cookie landed on ${staffLanded})`);
  }

  await context.close();
}

async function crawlStoreLoggedOut(browser) {
  const label = "store-anon";
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  watchErrors(page, errors);

  // /store must render publicly, gate every price behind "Login to view pricing", and
  // show ZERO dollar amounts inside the product grid.
  errors.length = 0;
  try {
    await page.goto(`${BASE}/store`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(800);
    const body = (await page.textContent("body")) || "";
    if (body.includes("Application error")) errors.push('body: contains "Application error"');
    if (!body.includes("Login to view pricing")) {
      errors.push('anonymous /store is missing "Login to view pricing"');
    }
    const gridText = (await page.textContent('[data-testid="store-grid"]').catch(() => null)) ?? null;
    if (gridText === null) {
      errors.push("no [data-testid=store-grid] found on anonymous /store");
    } else if (/\$\d/.test(gridText)) {
      errors.push("anonymous /store grid leaks a dollar amount");
    }
  } catch (err) {
    errors.push(`navigation: ${err.message}`);
  }
  report(label, "/store", errors);

  // Gated store routes must bounce anonymous visitors to the store login.
  await page.goto(`${BASE}/store/account`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(500);
  const landed = new URL(page.url()).pathname;
  if (landed === "/store/login") {
    console.log(`ok   [${label}] /store/account redirected anonymous visitor to ${landed}`);
  } else {
    failures.push({ label, route: "/store/account", errors: [`anonymous visitor was NOT redirected to /store/login (landed ${landed})`] });
    console.log(`FAIL [${label}] /store/account (anonymous landed on ${landed})`);
  }

  await context.close();
}

// Cross-surface isolation from the staff side: a rep's NextAuth session is never consulted
// for /store, so /store/account must 307 the rep to the STORE login, not let them in.
async function crawlRepStoreIsolation(browser) {
  const label = "rep-x-store";
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);
  await page.fill("#email", "rep1@demo.lapeptides.net");
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  await page.goto(`${BASE}/store/account`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(500);
  const landed = new URL(page.url()).pathname;
  if (landed === "/store/login") {
    console.log(`ok   [${label}] /store/account redirected rep session to ${landed}`);
  } else {
    failures.push({ label, route: "/store/account", errors: [`rep session was NOT redirected to /store/login (landed ${landed})`] });
    console.log(`FAIL [${label}] /store/account (rep session landed on ${landed})`);
  }

  await context.close();
}

const browser = await chromium.launch();
try {
  for (const user of USERS) await crawlUser(browser, user);
  await crawlStore(browser);
  await crawlStoreLoggedOut(browser);
  await crawlRepStoreIsolation(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} page visit(s) had errors.`);
  process.exit(1);
}
console.log("\nAll pages clean.");
