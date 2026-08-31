"use client";

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/shared/Logo";

const EASE = [0.16, 1, 0.3, 1] as const;
const FLIGHT_S = 0.9;

type Phase = "cover" | "reveal" | "done";

/** Logo a pantalla completa que vuela a su sitio en la cabecera antes de revelar el login. */
export function LoginSplash({ children }: { children: ReactNode }) {
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
      <div
        className="relative z-10 flex w-full flex-col items-center"
        aria-hidden={!uncovered}
        style={{ pointerEvents: uncovered ? "auto" : "none" }}
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          {uncovered ? (
            <motion.div layoutId="portal-logo" transition={{ layout: { duration: FLIGHT_S, ease: EASE } }}>
              <Logo className="size-14" px={56} priority />
            </motion.div>
          ) : (
            <div className="size-14" aria-hidden />
          )}
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">CVOrotava</h1>
            <p className="text-sm text-muted-foreground">Portal del club</p>
          </div>
        </div>

        {children}
      </div>

      {phase === "cover" ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
          <motion.div layoutId="portal-logo" transition={{ layout: { duration: FLIGHT_S, ease: EASE } }}>
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
    </LayoutGroup>
  );
}
