import { cn } from "@/lib/utils";

export function WarehouseBoxMark({
  ghost = false,
  size = "md",
  className,
}: {
  ghost?: boolean;
  size?: "icon" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 72 64"
      fill="none"
      className={cn(
        "warehouse-box-mark",
        ghost && "warehouse-box-mark--ghost",
        size === "icon" && "warehouse-box-mark--icon",
        size === "sm" && "warehouse-box-mark--sm",
        size === "lg" && "warehouse-box-mark--lg",
        className,
      )}
      aria-hidden
    >
      <path
        className="warehouse-box-mark__left"
        d="M14 22 L36 34 V52 L14 40 Z"
      />
      <path
        className="warehouse-box-mark__right"
        d="M36 34 L58 22 V40 L36 52 Z"
      />
      <path
        className="warehouse-box-mark__lid"
        d="M14 22 L36 10 L58 22 L36 34 Z"
      />
      <path className="warehouse-box-mark__seam" d="M36 10 V34" />
    </svg>
  );
}

export function WarehouseCabinetMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("warehouse-cabinet-mark", className)}
      aria-hidden
    >
      <rect className="warehouse-cabinet-mark__body" x="6" y="5" width="20" height="22" rx="2" />
      <path className="warehouse-cabinet-mark__split" d="M16 7 V25" />
      <circle className="warehouse-cabinet-mark__knob" cx="13.5" cy="16" r="1.1" />
      <circle className="warehouse-cabinet-mark__knob" cx="18.5" cy="16" r="1.1" />
    </svg>
  );
}
