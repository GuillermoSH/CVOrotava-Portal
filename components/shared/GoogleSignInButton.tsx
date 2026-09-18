"use client";

import { useState } from "react";

import { GoogleIcon } from "@/components/shared/GoogleIcon";
import { portalOAuthRedirectUrl } from "@/lib/auth/app-origin";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: portalOAuthRedirectUrl(window.location.origin),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      console.error("No se pudo iniciar sesión con Google:", error.message);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border px-5 text-[15px] font-semibold tracking-[-0.01em] transition-[transform,box-shadow,background-color] duration-200",
        "border border-[rgba(0,0,0,0.09)] bg-primary-foreground text-[#1a1a1f] hover:bg-[color-mix(in_srgb,var(--primary-foreground)_94%,#000)]",
        "shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.985] disabled:cursor-wait disabled:opacity-70",
      )}
    >
      <GoogleIcon className="size-5" />
      {loading ? "Conectando…" : "Continuar con Google"}
    </button>
  );
}
