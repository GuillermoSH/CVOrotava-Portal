import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex flex-col gap-3 sm:mb-7", className)}>
      {back ? (
        <Link
          href={back.href}
          className="inline-flex min-h-11 w-fit items-center gap-0.5 text-sm font-medium text-brand transition-colors hover:text-brand/80"
        >
          <ChevronLeft className="size-4 shrink-0" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.65rem] font-semibold tracking-[-0.02em] text-balance text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
