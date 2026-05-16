import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {

  const host =
    request.headers.get("host");

  // redirect non-www -> www
  if (host === "zafyfashion.com") {

    return NextResponse.redirect(
      `https://www.zafyfashion.com${request.nextUrl.pathname}${request.nextUrl.search}`,
      308
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};