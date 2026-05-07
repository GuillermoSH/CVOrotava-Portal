"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export function MonthlyPaymentsCard({
  paid,
  target,
}: {
  paid: number;
  target: number;
}) {
  const safeTarget = target > 0 ? target : 1;
  const pct = Math.min(100, Math.round((paid / safeTarget) * 100));
  const chartData = [{ name: "progress", value: pct, fill: "var(--club-brand)" }];

  return (
    <Card size="sm">
      <CardHeader className="gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pagos este mes
          </CardDescription>
          <span className="text-[11px] font-normal normal-case text-muted-foreground">
            Meta mensual
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative h-36 w-full min-h-36">
          <ResponsiveContainer width="100%" height={144}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="68%"
              outerRadius="100%"
              barSize={10}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={8}
                background={{ fill: "var(--club-surface-2)" }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {pct}%
            </span>
            <span className="text-[11px] text-muted-foreground">
              {paid} / {target} pagos
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
