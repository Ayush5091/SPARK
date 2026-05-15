import { NextRequest, NextResponse } from "next/server";

const publicPaths = new Set(["/login", "/register"]);
const publicPrefixes = ["/auth/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  if (publicPaths.has(pathname) || publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
