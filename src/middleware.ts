import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, Next.js internals, public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/snippets/share") ||
    pathname.startsWith("/s/") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Allow API requests with Authorization or API key headers to pass through
  // to route handlers, where PAT / Bearer tokens are verified in Node.js runtime
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key");
  if (pathname.startsWith("/api/") && authHeader) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const verified = sessionCookie ? await verifyToken(sessionCookie) : null;
  const isValidSession = Boolean(verified);

  // If user is accessing /login
  if (pathname === "/login") {
    if (isValidSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const response = NextResponse.next();
    if (sessionCookie && !isValidSession) {
      response.cookies.delete(COOKIE_NAME);
    }
    return response;
  }

  // If user is accessing protected routes and has no valid session
  if (!isValidSession) {
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
      if (sessionCookie) response.cookies.delete(COOKIE_NAME);
      return response;
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (sessionCookie) response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
