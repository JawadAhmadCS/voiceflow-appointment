import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Serve marketing landing at `/` while keeping `/dashboard` as the Next app. */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/landing.html", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
