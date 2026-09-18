import { cn } from "@/lib/utils";

export function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--club-surface-2)]", className)}
      aria-hidden
    />
  );
}

export function FilterChipsSkeleton({
  count = 2,
  className = "mb-5",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} className="h-9 w-24 rounded-lg" />
      ))}
    </div>
  );
}

/** Chips con etiqueta conocida (el recuento sí espera datos). */
export function FilterChipRow({
  labels,
  activeIndex = 0,
  className,
}: {
  labels: string[];
  activeIndex?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {labels.map((label, index) => (
        <span
          key={label}
          className={cn(
            "clothing-filter-chip pointer-events-none",
            index === activeIndex && "clothing-filter-chip--active",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function SearchBone({ className }: { className?: string }) {
  return <Bone className={cn("h-11 w-full rounded-lg", className)} />;
}

export function FormFieldBone({ wide }: { wide?: boolean }) {
  return (
    <div className="space-y-2">
      <Bone className="h-4 w-24 rounded-md" />
      <Bone className={cn("h-11 w-full rounded-lg", wide && "min-h-[4.5rem]")} />
    </div>
  );
}

export function ListCardBone({
  chips = 2,
  trailingChip = false,
}: {
  chips?: number;
  trailingChip?: boolean;
}) {
  return (
    <div className="clothing-list-card">
      <div className="flex items-start justify-between gap-3">
        <Bone className="h-5 w-[46%] max-w-full rounded-md" />
        {trailingChip ? <Bone className="h-5 w-16 shrink-0 rounded-full" /> : null}
      </div>
      <Bone className="mt-2 h-4 w-[58%] max-w-full rounded-md" />
      {chips > 0 ? (
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: chips }, (_, index) => (
            <Bone key={index} className="h-5 w-16 rounded-full" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
