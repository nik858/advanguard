import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_CONFIG } from "@/lib/auth";

export const config = {
  // Every landing page is editable in place, each with its own content.
  // Kept literal (not built from lib/landing/variants) because Next requires
  // the matcher to be statically analysable.
  matcher: ["/admin/:path*", "/", "/premium", "/premium.slo"],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const token = req.cookies.get(SESSION_CONFIG.cookieName)?.value;
  const session = token ? await verifySession(token) : null;

  if (url.pathname.startsWith("/admin")) {
    if (url.pathname === "/admin/login") return NextResponse.next();
    if (!session) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // For the landing pages, inject a header indicating edit mode availability
  const res = NextResponse.next();
  if (session) res.headers.set("x-adv-edit-mode", "1");
  return res;
}
