import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showcaseFeeGroups, showcasePlayerOverrides } from "@/lib/mocks/payments-showcase";

export default function AdminPaymentsConfigPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Configuración de grupos y cuotas</h2>
        <p className="text-sm text-muted-foreground">
          Vista PC para definir cuotas por grupo y excepciones por jugador.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Plantillas por grupo</CardTitle>
          <CardDescription>Importe base mensual y concepto de temporada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {showcaseFeeGroups.map((group) => (
            <div key={group.id} className="rounded-md border px-3 py-2 text-sm">
              <p className="font-medium">{group.label}</p>
              <p className="text-muted-foreground">
                {group.concept} · {group.monthlyAmount} EUR/mes · periodo {group.startMonth} a {group.endMonth}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Excepciones por jugador</CardTitle>
          <CardDescription>Ajustes especiales sobre la cuota del grupo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {showcasePlayerOverrides.map((override) => (
            <div key={override.playerId} className="rounded-md border px-3 py-2 text-sm">
              <p className="font-medium">{override.playerId}</p>
              <p className="text-muted-foreground">
                {override.monthlyAmount} EUR/mes · {override.note}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
