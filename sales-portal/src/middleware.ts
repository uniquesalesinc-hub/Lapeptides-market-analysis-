import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ADMIN_ONLY_PREFIXES } from "@/lib/permissions";
import { CLIENT_SESSION_COOKIE } from "@/lib/clientCookie";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];
// "/api/q/" belongs with "/q/": the public quote page's PDF download route is gated by the
// same unguessable token as the page itself, and without this prefix the middleware 307s an
// unauthenticated customer's PDF click to the staff /login screen.
const PUBLIC_PREFIXES = ["/q/", "/api/q/", "/api/auth", "/icons", "/manifest.json", "/sw.js"];

/**
 * Store account routes require the CLIENT session cookie. Everything else under /store is
 * public browse. The client cookie is a completely separate surface from the NextAuth
 * session: it is only ever consulted for these store prefixes, so it can never open a
 * (portal)/rep/admin route, and a NextAuth session is never consulted for /store, so a
 * logged-in rep gets no client access either.
 */
const CLIENT_GATED_PREFIXES = ["/store/account", "/store/cart", "/store/checkout", "/store/orders"];

/**
 * Prefix match on a real path segment boundary, not a raw string prefix — `pathname.startsWith(p)`
 * would also match an unrelated future route that merely starts with the same characters (e.g.
 * a hypothetical `/reportsPublic` route would satisfy `startsWith("/reports")` and be silently
 * treated as admin-only, or a hypothetical `/api/authorize` route would satisfy
 * `startsWith("/api/auth")` and be silently treated as public). Requiring the next character to
 * be `/` or end-of-string makes this an intentional decision instead of an accidental one.
 */
function matchesPrefix(pathname: string, prefix: string): boolean {
  const normalized = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return pathname === normalized || pathname.startsWith(`${normalized}/`);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Client storefront surface. Handled BEFORE any NextAuth logic so the two auth worlds
  // never mix. The Edge runtime has neither node:crypto nor Prisma, so this is a cheap
  // presence gate for UX (307 to the store login with a return path); the authoritative
  // HMAC + expiry + ACTIVE-status verification happens in requireClient()/getClientSession()
  // on every store page and action - a tampered, expired, or disabled-account cookie passes
  // this presence check and is then rejected server-side. This mirrors the rep surface,
  // where session.ts re-checks the database on every request.
  if (matchesPrefix(pathname, "/store")) {
    const needsClient = CLIENT_GATED_PREFIXES.some((p) => matchesPrefix(pathname, p));
    if (needsClient && !req.cookies.get(CLIENT_SESSION_COOKIE)?.value) {
      const loginUrl = new URL("/store/login", req.nextUrl.origin);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => matchesPrefix(pathname, p));
  if (isPublic) return NextResponse.next();

  // Brand-asset bytes serve BOTH auth surfaces (staff Brand tab and the client portal's
  // /store/account/brand thumbnails). A request carrying the client cookie passes through
  // here so the route handler can do the authoritative check: verified client sessions may
  // read only their own customer's assets. Staff requests without the client cookie keep
  // flowing through the NextAuth gate below, and requests with neither still 307 to /login.
  if (matchesPrefix(pathname, "/api/brand-assets") && req.cookies.get(CLIENT_SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminRoute = ADMIN_ONLY_PREFIXES.some((p) => matchesPrefix(pathname, p));
  if (isAdminRoute && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
