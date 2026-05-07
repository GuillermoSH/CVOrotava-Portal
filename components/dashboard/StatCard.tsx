import type { ReactNode } from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Accent = "default" | "brand" | "warning";

export function StatCard({
  label,
  value,
  helper,
  accent = "default",
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  accent?: Accent;
}) {
  return (
    <Card size="sm">
      <CardHeader className="gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </CardDescription>
          {helper ? (
            <span className="text-[11px] font-normal normal-case text-muted-foreground">
              {helper}
            </span>
          ) : null}
        </div>
        <CardTitle
          className={cn(
            "text-3xl font-semibold tabular-nums tracking-tight",
            accent === "brand" && "text-brand",
            accent === "warning" && "text-destructive",
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
