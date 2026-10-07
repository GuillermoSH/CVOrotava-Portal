import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match app routes for session refresh; skip static assets, fonts,
     * SEO files, and Next internals.
     */
    "/((?!_next/static|_next/image|_next/.*|favicon.ico|robots.txt|sitemap(?:\\.xml)?|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)",
  ],
};
