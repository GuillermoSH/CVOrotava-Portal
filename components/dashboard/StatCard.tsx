import type { ReactNode } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/club/Card";
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
      <CardHeader className="gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          {helper ? (
            <span className="text-xs text-muted-foreground">{helper}</span>
          ) : null}
        </div>
        <CardTitle
          className={cn(
            "text-3xl font-semibold tabular-nums tracking-tight",
            accent === "brand" && "stat-value-gradient",
            accent === "warning" && "text-destructive",
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
