"use client";

import { cn } from "@/lib/utils";

export function TableRowInteractive({
  onActivate,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"tr">, "onClick"> & {
  onActivate: () => void;
}) {
  return (
    <tr
      role="button"
      tabIndex={0}
      className={cn("club-table-row--interactive", className)}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      {...props}
    >
      {children}
    </tr>
  );
}
