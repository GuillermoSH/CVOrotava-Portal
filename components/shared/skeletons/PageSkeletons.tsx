import { Bone } from "@/components/shared/Bone";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        <Bone className="h-8 w-48 max-w-full rounded-lg sm:h-9 sm:w-64" />
        <Bone className="h-4 w-72 max-w-full rounded-md" />
      </div>
      <Bone className="h-10 w-full rounded-lg sm:w-36" />
    </div>
  );
}

export function TableRowsSkeleton({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: cols }, (_, col) => (
            <Bone
              key={col}
              className={cn("h-10 flex-1 rounded-md", col === 0 && "max-w-[12rem]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
