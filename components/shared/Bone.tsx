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
