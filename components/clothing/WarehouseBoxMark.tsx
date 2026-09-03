import { cn } from "@/lib/utils";

export function WarehouseBoxMark({
  code,
  filled = false,
  ghost = false,
  size = "md",
  className,
}: {
  code?: string;
  filled?: boolean;
  ghost?: boolean;
  size?: "icon" | "sm" | "md" | "lg";
  className?: string;
}) {
  const displayCode = (code ?? "").trim().slice(0, 10);
  const compactCode = displayCode.length > 7;

  return (
    <svg
      viewBox="0 0 140 118"
      className={cn(
        "warehouse-box-mark",
        filled && "warehouse-box-mark--filled",
        ghost && "warehouse-box-mark--ghost",
        size === "icon" && "warehouse-box-mark--icon",
        size === "sm" && "warehouse-box-mark--sm",
        size === "lg" && "warehouse-box-mark--lg",
        className,
      )}
      aria-hidden
    >
      <ellipse className="warehouse-box-mark__shadow" cx="70" cy="108" rx="46" ry="6" />

      <path
        className="warehouse-box-mark__side"
        d="M108 40 L122 24 L122 86 L108 100 Z"
      />

      <g className="warehouse-box-mark__lid-group">
        <path
          className="warehouse-box-mark__lid"
          d="M22 24 L118 24 L108 40 L28 40 Z"
        />
        <rect className="warehouse-box-mark__tape" x="64" y="22" width="12" height="20" rx="1" />
      </g>

      <rect className="warehouse-box-mark__body" x="28" y="40" width="80" height="60" rx="3" />
      <rect className="warehouse-box-mark__lip" x="28" y="40" width="80" height="7" />

      {filled ? (
        <g className="warehouse-box-mark__contents">
          <path d="M46 48 H70 L66 62 H42 Z" />
          <path d="M72 50 H94 L90 64 H68 Z" />
        </g>
      ) : null}

      <rect
        className="warehouse-box-mark__handle"
        x="54"
        y="52"
        width="32"
        height="11"
        rx="5.5"
      />

      <rect className="warehouse-box-mark__label" x="38" y="70" width="64" height="24" rx="3" />
      {ghost && size !== "icon" ? (
        <path
          className="warehouse-box-mark__plus"
          d="M70 76 V88 M64 82 H76"
        />
      ) : displayCode && size !== "icon" ? (
        <text
          className={cn("warehouse-box-mark__code", compactCode && "warehouse-box-mark__code--compact")}
          x="70"
          y="85.5"
          textAnchor="middle"
        >
          {displayCode}
        </text>
      ) : null}
    </svg>
  );
}

export function WarehouseCabinetMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("warehouse-cabinet-mark", className)}
      aria-hidden
    >
      <rect className="warehouse-cabinet-mark__body" x="5" y="4" width="22" height="24" rx="2.5" />
      <path className="warehouse-cabinet-mark__split" d="M16 6.5 V26" />
      <circle className="warehouse-cabinet-mark__knob" cx="13" cy="16" r="1.2" />
      <circle className="warehouse-cabinet-mark__knob" cx="19" cy="16" r="1.2" />
    </svg>
  );
}
