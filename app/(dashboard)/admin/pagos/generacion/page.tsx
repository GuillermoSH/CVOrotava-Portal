"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  showcaseChargeSeed,
  showcaseFeeGroups,
  showcasePlayerOverrides,
  showcasePlayers,
  showcaseSeasonMonths,
  type ShowcaseCharge,
} from "@/lib/mocks/payments-showcase";
import { generateSeasonCharges } from "@/lib/payments/showcase-domain";

export default function AdminPaymentsGeneratePage() {
  const [charges, setCharges] = React.useState<ShowcaseCharge[]>(showcaseChargeSeed);
  const [message, setMessage] = React.useState("Pendiente de generar temporada.");

  function runGeneration() {
    const next = generateSeasonCharges({
      players: showcasePlayers,
      groups: showcaseFeeGroups,
      overrides: showcasePlayerOverrides,
      months: showcaseSeasonMonths,
      existingCharges: charges,
    });
    const created = next.length - charges.length;
    setCharges(next);
    setMessage(`Generación completada. Cargos nuevos: ${created}. Total actual: ${next.length}.`);
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Generar temporada</h2>
        <p className="text-sm text-muted-foreground">
          Acción masiva de PC para crear cuotas de septiembre a julio con deduplicación.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ejecución</CardTitle>
          <CardDescription>Relanzar no duplica jugador+mes+concepto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" onClick={runGeneration}>
            Generar temporada mock
          </Button>
          <p className="rounded-md border px-3 py-2 text-sm">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
