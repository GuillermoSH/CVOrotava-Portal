"use client";

import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { signInWithPassword } from "@/app/(auth)/login/actions";
import { LoginAmbient } from "@/components/auth/LoginAmbient";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { FormInput } from "@/components/club/forms";
import { appRoutes } from "@/lib/constants";

const EASE = [0.16, 1, 0.3, 1] as const;
const FLIGHT_S = 0.9;

type Phase = "cover" | "reveal" | "done";

export function LoginScreen({ errorMessage }: { errorMessage: string | null }) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("cover");
  const uncovered = phase !== "cover";

  useEffect(() => {
    if (reduceMotion) {
      setPhase("done");
      return;
    }
    const hold = window.setTimeout(() => setPhase("reveal"), 700);
    return () => window.clearTimeout(hold);
  }, [reduceMotion]);

  return (
    <LayoutGroup>
      <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-10 text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 18%, var(--club-brand-soft), transparent 70%)",
          }}
        />
        {uncovered ? <LoginAmbient /> : null}

        <div className="absolute top-4 right-4 z-30 md:top-6 md:right-6">
          <ThemeToggle variant="expanded" />
        </div>

        <div
          className="relative z-10 flex w-full max-w-[360px] flex-col items-center"
          aria-hidden={!uncovered}
          style={{ pointerEvents: uncovered ? "auto" : "none" }}
        >
          <div className="mb-8 flex flex-col items-center gap-5">
            {uncovered ? (
              <motion.div
                layoutId="portal-logo"
                transition={{ layout: { duration: FLIGHT_S, ease: EASE } }}
              >
                <Logo className="size-16" px={64} priority />
              </motion.div>
            ) : (
              <div className="size-16" aria-hidden />
            )}

            <div className="text-center">
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[2rem]">
                C.V. Orotava
              </h1>
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                Portal del club
              </p>
            </div>
          </div>

          <p className="mb-8 text-center text-sm leading-relaxed text-muted-foreground">
            Cuotas, pagos y reserva de ropa del club
          </p>

          {errorMessage ? (
            <div
              role="alert"
              className="mb-5 w-full rounded-[var(--radius-md)] border border-destructive/35 bg-[var(--club-brand-soft)] px-4 py-3 text-left text-sm text-destructive"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="w-full space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Dirección y staff
              </p>
              <GoogleSignInButton />
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" aria-hidden />
              o
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>

            <form action={signInWithPassword} className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Familias</p>

              <FormInput
                label="Correo electrónico"
                name="email"
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.es"
                className="h-11"
                required
              />

              <FormInput
                label="Contraseña"
                name="password"
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11"
                required
              />

              <button type="submit" className="btn-primary btn-primary--lg btn-primary--block">
                Entrar
              </button>
            </form>
          </div>

          <Link
            href={appRoutes.home}
            className="mt-6 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Volver al inicio
          </Link>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Acceso privado · La Orotava, Tenerife
          </p>
        </div>

        {phase === "cover" ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
            <motion.div
              layoutId="portal-logo"
              transition={{ layout: { duration: FLIGHT_S, ease: EASE } }}
            >
              <Logo className="size-36 sm:size-44" px={176} priority />
            </motion.div>
          </div>
        ) : null}

        {phase === "reveal" ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-background"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: FLIGHT_S, ease: EASE }}
            onAnimationComplete={() => setPhase("done")}
          />
        ) : null}
      </main>
    </LayoutGroup>
  );
}
