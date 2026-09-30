"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  label: string;
};

export function Pagination({ page, pageCount, onChange, label }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center gap-1.5">
      <p className="text-[11px] tabular-nums text-muted-foreground md:text-xs">
        {page} / {pageCount}
        <span className="sr-only"> · {label}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={cn(
            "inline-flex size-8 min-h-8 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-border text-muted-foreground transition-colors",
            "hover:bg-[var(--club-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40",
          )}
          aria-label={`${label}: página anterior`}
        >
          <ChevronLeft className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className={cn(
            "inline-flex size-8 min-h-8 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-border text-muted-foreground transition-colors",
            "hover:bg-[var(--club-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40",
          )}
          aria-label={`${label}: página siguiente`}
        >
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
