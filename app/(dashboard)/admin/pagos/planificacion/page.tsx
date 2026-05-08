import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  showcaseChargeSeed,
  showcaseFeeGroups,
  showcasePlayerOverrides,
  showcasePlayers,
  showcaseSeasonMonths,
} from "@/lib/mocks/payments-showcase";
import { formatMonthLabel, generateSeasonCharges } from "@/lib/payments/showcase-domain";

export default function AdminPaymentsPlanningPage() {
  const charges = generateSeasonCharges({
    players: showcasePlayers,
    groups: showcaseFeeGroups,
    overrides: showcasePlayerOverrides,
    months: showcaseSeasonMonths,
    existingCharges: showcaseChargeSeed,
  });
  const pending = charges.filter((charge) => charge.status === "pendiente");

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Revisar planificación</h2>
        <p className="text-sm text-muted-foreground">
          Comprobación de cargos esperados por grupo, mes y excepciones.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total cargos</CardTitle>
          </CardHeader>
          <CardContent>{charges.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pendientes</CardTitle>
          </CardHeader>
          <CardContent>{pending.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Grupos</CardTitle>
          </CardHeader>
          <CardContent>{showcaseFeeGroups.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Excepciones</CardTitle>
          </CardHeader>
          <CardContent>{showcasePlayerOverrides.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Primeros pendientes</CardTitle>
          <CardDescription>Vista rápida para revisar que la generación es coherente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.slice(0, 12).map((charge) => (
            <div key={charge.id} className="rounded-md border px-3 py-2 text-sm">
              <p className="font-medium">{charge.playerName}</p>
              <p className="text-muted-foreground">
                {charge.familyName} · {charge.concept} · {charge.amount} EUR · {formatMonthLabel(charge.monthKey)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
