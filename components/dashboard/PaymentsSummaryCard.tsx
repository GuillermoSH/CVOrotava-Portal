import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

function pctOfYear(amount: number, yearTotal: number) {
  if (yearTotal <= 0) return 0;
  return Math.min(100, Math.round((amount / yearTotal) * 100));
}

function MiniBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PaymentsSummaryCard({
  yearTotal,
  monthTotal,
  clothingExpected,
}: {
  yearTotal: number;
  monthTotal: number;
  clothingExpected: number;
}) {
  const pctMonth = pctOfYear(monthTotal, yearTotal);
  const pctClothing = pctOfYear(clothingExpected, yearTotal);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de pagos</CardTitle>
        <CardDescription>
          Recaudación anual, mensual y previsión de tienda (reservas de ropa).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recaudación del año
            </p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-brand md:text-3xl">
              {eur.format(yearTotal)}
            </p>
            <MiniBar pct={100} />
            <p className="text-xs text-muted-foreground">Referencia anual (100%)</p>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recaudado en el mes
            </p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-3xl">
              {eur.format(monthTotal)}
            </p>
            <MiniBar pct={pctMonth} />
            <p className="text-xs text-muted-foreground">
              {pctMonth}% respecto al total anual
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Previsto por reservas de ropa
            </p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-3xl">
              {eur.format(clothingExpected)}
            </p>
            <MiniBar pct={pctClothing} />
            <p className="text-xs text-muted-foreground">
              {pctClothing}% respecto al total anual (supuesto tienda)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
