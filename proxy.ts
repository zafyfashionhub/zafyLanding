// proxy.ts  ← rename from middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
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
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt).*)",
  ],
};