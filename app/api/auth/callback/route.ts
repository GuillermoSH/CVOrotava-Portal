import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getRequestOrigin, toAbsoluteAppUrl } from "@/lib/auth/app-origin.server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type PendingCookie = { name: string; value: string; options: Record<string, unknown> };

/**
 * Callback OAuth de Google (PKCE).
 * Next 15 no fusiona con fiabilidad `cookies().set(...)` dentro de un
 * `NextResponse.redirect(...)` posterior: se guardan las cookies en un Map
 * y se aplican sobre la respuesta final.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";
  const origin = getRequestOrigin(request);

  if (!code) {
    return NextResponse.redirect(toAbsoluteAppUrl("/login", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(toAbsoluteAppUrl("/login?error=oauth", origin));
  }

  const pending = new Map<string, PendingCookie>();

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pending.set(name, { name, value, options });
        });
      },
    },
  });

  const finish = (path: string, clearAuth = false) => {
    const response = NextResponse.redirect(toAbsoluteAppUrl(path, origin));
    pending.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    if (clearAuth) clearPortalAuthCookies(response);
    return response;
  };

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("OAuth code exchange failed:", exchangeError.message);
    return finish("/login?error=oauth", true);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    await supabase.auth.signOut();
    return finish("/login?error=no-email", true);
  }

  const email = user.email.trim().toLowerCase();
  const admin = createServiceRoleClient();

  const { data: allowedRows, error: allowedError } = await admin
    .from("allowed_emails")
    .select("email");

  const allowed =
    !allowedError &&
    (allowedRows ?? []).some(
      (row) => String(row.email ?? "").trim().toLowerCase() === email,
    );

  if (!allowed) {
    console.warn(`Portal access denied (not in allowed_emails): ${email}`);
    await revokeSession(admin, supabase, user.id);
    return finish("/login?error=no-club-account", true);
  }

  const { data: roleRows, error: rolesError } = await admin
    .from("user_app_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("app", "portal");

  if (rolesError || !roleRows?.length) {
    console.warn(`Portal access denied (no user_app_roles for app='portal'): ${email}`);
    await revokeSession(admin, supabase, user.id);
    return finish("/login?error=sin-acceso-portal", true);
  }

  return finish(next);
}

async function revokeSession(
  admin: ReturnType<typeof createServiceRoleClient>,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  try {
    await admin.auth.admin.signOut(userId, "global");
  } catch (err) {
    console.error("Failed to globally revoke session for denied user:", err);
  }
  await supabase.auth.signOut();
}

function clearPortalAuthCookies(response: NextResponse) {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https?:\/\/([a-z0-9-]+)\.supabase\.co/i,
  )?.[1];

  const names = new Set<string>(
    projectRef
      ? [`sb-${projectRef}-auth-token`, `sb-${projectRef}-auth-token-code-verifier`]
      : [],
  );
  for (const cookie of response.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")) {
      names.add(cookie.name);
    }
  }
  for (const name of names) {
    response.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0) });
  }
}
