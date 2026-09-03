"use client";

import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/** Fondo ambiental con blobs — patrón de Team Manager adaptado a tokens del Portal. */
export function AmbientBackground({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-colors duration-500",
        light ? "bg-background" : "bg-background",
        className,
      )}
    >
      <div
        className={cn(
          "absolute -left-[10%] top-[-10%] h-[45vw] w-[45vw] rounded-full blur-[130px] transition-colors duration-500",
          light ? "bg-brand/20" : "bg-brand/10",
        )}
      />
      <div
        className={cn(
          "absolute -right-[10%] bottom-[-20%] h-[50vw] w-[50vw] rounded-full blur-[140px] transition-colors duration-500",
          light ? "bg-violet-400/15" : "bg-purple-900/10",
        )}
      />
      <div
        className={cn(
          "absolute left-[20%] top-[40%] h-[30vw] w-[30vw] rounded-full blur-[120px] transition-colors duration-500",
          light ? "bg-sky-300/12" : "bg-blue-900/5",
        )}
      />
    </div>
  );
}
