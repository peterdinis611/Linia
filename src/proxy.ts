import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  defaultLocale,
  isLocale,
  localeCookie,
  negotiateLocale,
} from "@/i18n/config";

function pathnameLocale(pathname: string) {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

function preferredLocale(request: NextRequest) {
  const cookie = request.cookies.get(localeCookie)?.value;
  if (isLocale(cookie)) return cookie;
  return negotiateLocale(request.headers.get("accept-language"));
}

function withColorSchemeHint(response: NextResponse) {
  response.headers.append("Accept-CH", "Sec-CH-Prefers-Color-Scheme");
  response.headers.append("Vary", "Sec-CH-Prefers-Color-Scheme");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const current = pathnameLocale(pathname);

  if (current) {
    const response = withColorSchemeHint(NextResponse.next());
    response.cookies.set(localeCookie, current, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const locale = preferredLocale(request) ?? defaultLocale;
  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  const response = withColorSchemeHint(NextResponse.redirect(request.nextUrl));
  response.cookies.set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\..*).*)"],
};
