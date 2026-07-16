import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ADMIN_ONLY_PREFIXES } from "@/lib/permissions";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];
const PUBLIC_PREFIXES = ["/q/", "/api/auth", "/icons", "/manifest.json", "/sw.js"];

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

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => matchesPrefix(pathname, p));
  if (isPublic) return NextResponse.next();

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
