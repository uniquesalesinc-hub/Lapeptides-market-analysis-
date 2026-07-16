/**
 * Name of the client-portal session cookie. Lives in its own dependency-free module so the
 * Edge middleware can import it without dragging in node:crypto (clientAuthToken) or Prisma
 * (clientSession). This cookie is a completely separate surface from the NextAuth session:
 * it never grants (portal)/rep/admin access, and a NextAuth session never grants store access.
 */
export const CLIENT_SESSION_COOKIE = "lap_client_session";
