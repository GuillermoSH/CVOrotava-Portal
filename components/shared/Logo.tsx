import * as React from "react";

import { cn } from "@/lib/utils";

/** Placeholder mark — replace with official club SVG when asset ready. */
export function Logo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="Club Voleibol Orotava"
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect width="40" height="40" rx="8" className="fill-club-surface" />
      <path
        d="M8 28 L20 10 L32 28 Z"
        className="fill-none stroke-brand stroke-[2.5]"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="24" r="3" className="fill-brand-soft" />
    </svg>
  );
}
