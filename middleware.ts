import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // Strip port if present (e.g. "zafyfashion.com:443")
  const hostname = host.split(":")[0];

  if (hostname === "zafyfashion.com") {
    const url = request.nextUrl.clone();
    url.hostname = "www.zafyfashion.com";
    url.protocol = "https:";

    return NextResponse.redirect(url, { status: 308 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT static files and API routes
     * Added _vercel to avoid matching Vercel's internal routes
     */
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt).*)",
  ],
};