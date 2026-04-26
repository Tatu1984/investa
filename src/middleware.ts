import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ACCESS_COOKIE } from "@/backend/utils/cookies.util";

/**
 * Edge middleware — runs before every request to a protected page.
 *
 * Rules:
 *  - `/(app)/*` routes require a valid JWT cookie; otherwise redirect to /login?next=…
 *  - Already-logged-in users hitting /login or /register bounce to /for-you
 *  - APIs are not matched here; their auth is enforced in route handlers (withAuth)
 */

const PUBLIC_PAGES = new Set<string>(["/", "/login", "/register", "/forgot-password", "/reset-password"]);
const AUTH_PAGES = new Set<string>(["/login", "/register"]);
const APP_PREFIXES = ["/dashboard", "/assets", "/compare", "/signals", "/reports", "/alerts", "/settings", "/for-you", "/admin"];

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? "");

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, accessSecret, { issuer: "investa", audience: "investa-portal" });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isAppRoute = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAuthPage = AUTH_PAGES.has(pathname);

  if (!isAppRoute && !isAuthPage) return NextResponse.next();

  const authed = await isAuthed(req);

  // Protected page but no valid token → redirect to login with next=
  if (isAppRoute && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Already authed user hitting /login or /register → bounce to /for-you
  if (isAuthPage && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/for-you";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match everything except static files, Next internals, and API routes (handlers do their own auth).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};

// Avoid unused-variable removal
void PUBLIC_PAGES;
