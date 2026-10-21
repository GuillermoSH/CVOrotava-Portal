import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/club/Card";
import { cn } from "@/lib/utils";

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

function pctOf(amount: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((amount / total) * 100));
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
  seasonTotal,
  monthTotal,
  overdueTotal,
  overduePlayers,
}: {
  seasonTotal: number;
  monthTotal: number;
  overdueTotal: number;
  overduePlayers: number;
}) {
  const pctMonth = pctOf(monthTotal, seasonTotal);
  const pctOverdue = pctOf(overdueTotal, seasonTotal + overdueTotal);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de pagos</CardTitle>
        <CardDescription>
          Cobros anotados de la temporada y lo vencido pendiente de cobro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Recaudado en la temporada</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-brand md:text-3xl">
              {eur.format(seasonTotal)}
            </p>
            <MiniBar pct={100} />
            <p className="text-xs text-muted-foreground">Referencia de temporada (100%)</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Recaudado en el mes</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-3xl">
              {eur.format(monthTotal)}
            </p>
            <MiniBar pct={pctMonth} />
            <p className="text-xs text-muted-foreground">
              {pctMonth}% respecto al total de la temporada
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Vencido sin cobrar</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-3xl">
              {eur.format(overdueTotal)}
            </p>
            <MiniBar pct={pctOverdue} />
            <p className="text-xs text-muted-foreground">
              {overduePlayers === 0
                ? "Nadie con pagos vencidos"
                : `${overduePlayers} ${overduePlayers === 1 ? "jugador/a" : "jugadores/as"} con pagos vencidos`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
