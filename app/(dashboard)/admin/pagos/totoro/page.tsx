"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  showcasePaymentConcepts,
  showcasePaymentsSeed,
  showcasePlayers,
  type ShowcasePayment,
  type ShowcasePaymentMethod,
} from "@/lib/mocks/payments-showcase";
import { buildMockPayment, filterPlayers, parseAmount } from "@/lib/payments/showcase-domain";
import { cn } from "@/lib/utils";

type WizardStep = 1 | 2 | 3;

const stepLabels: Record<WizardStep, string> = {
  1: "Buscar jugador",
  2: "Registrar pago",
  3: "Confirmar y revisar",
};

export default function AdminPaymentsTotoroPage() {
  const [step, setStep] = React.useState<WizardStep>(1);
  const [query, setQuery] = React.useState("");
  const [selectedPlayerId, setSelectedPlayerId] = React.useState("");
  const [concept, setConcept] = React.useState<string>(showcasePaymentConcepts[0]);
  const [amount, setAmount] = React.useState("45");
  const [method, setMethod] = React.useState<ShowcasePaymentMethod>("transferencia");
  const [note, setNote] = React.useState("");
  const [payments, setPayments] = React.useState<ShowcasePayment[]>(showcasePaymentsSeed);
  const [feedback, setFeedback] = React.useState("");

  const players = React.useMemo(() => filterPlayers(showcasePlayers, query), [query]);
  const selectedPlayer = showcasePlayers.find((player) => player.id === selectedPlayerId);

  function nextStep() {
    if (step === 1 && !selectedPlayer) {
      setFeedback("Selecciona un jugador para continuar al registro.");
      return;
    }
    if (step < 3) setStep((prev) => (prev + 1) as WizardStep);
  }

  function previousStep() {
    if (step > 1) setStep((prev) => (prev - 1) as WizardStep);
  }

  function registerPayment() {
    if (!selectedPlayer) {
      setFeedback("No hay jugador seleccionado.");
      return;
    }
    const parsedAmount = parseAmount(amount);
    if (!parsedAmount) {
      setFeedback("El importe debe ser mayor que 0.");
      return;
    }

    const payment = buildMockPayment({
      player: selectedPlayer,
      concept,
      amount: parsedAmount,
      method,
      note,
    });
    setPayments((current) => [payment, ...current]);
    setFeedback(`Pago mock añadido a ${selectedPlayer.name}.`);
    setStep(3);
  }

  return (
    <div className="space-y-4 pb-24">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">TOTORO · Wizard móvil</h2>
        <p className="text-sm text-muted-foreground">
          Flujo guiado para minimizar errores cuando hay interrupciones en pabellón.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progreso</CardTitle>
          <CardDescription>Paso {step} de 3 · {stepLabels[step]}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-3 gap-2 text-xs">
            {[1, 2, 3].map((item) => {
              const stepNumber = item as WizardStep;
              const done = step >= stepNumber;
              return (
                <li
                  key={stepNumber}
                  className={cn(
                    "rounded-md border p-2 text-center",
                    done ? "border-border bg-muted text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="block font-semibold">{stepNumber}</span>
                  <span>{stepLabels[stepNumber]}</span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>1. Buscar y seleccionar jugador</CardTitle>
            <CardDescription>Escribe nombre o familia y elige una ficha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wizard-search">Buscar</Label>
              <Input
                id="wizard-search"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Ej: Acosta o Infantil"
              />
            </div>
            <ul className="space-y-2">
              {players.map((player) => {
                const isSelected = player.id === selectedPlayerId;
                return (
                  <li key={player.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected ? "border-border bg-muted" : "border-border/60",
                      )}
                    >
                      <p className="font-medium">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.familyName} · {player.team}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Registrar pago</CardTitle>
            <CardDescription>Formulario corto con valores por defecto para alta rápida.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-2 text-sm">
              <strong>{selectedPlayer?.name}</strong>
              <p className="text-xs text-muted-foreground">{selectedPlayer?.familyName}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wizard-concept">Concepto</Label>
              <select
                id="wizard-concept"
                value={concept}
                onChange={(event) => setConcept(event.currentTarget.value)}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3"
              >
                {showcasePaymentConcepts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wizard-amount">Importe</Label>
              <Input
                id="wizard-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.currentTarget.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wizard-method">Método</Label>
              <select
                id="wizard-method"
                value={method}
                onChange={(event) => setMethod(event.currentTarget.value as ShowcasePaymentMethod)}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3"
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wizard-note">Nota</Label>
              <Input
                id="wizard-note"
                value={note}
                onChange={(event) => setNote(event.currentTarget.value)}
                placeholder="Opcional"
              />
            </div>
            <Button type="button" className="h-10 w-full" onClick={registerPayment}>
              Confirmar alta mock
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>3. Confirmación e historial</CardTitle>
            <CardDescription>Revisa el alta y continúa con el siguiente jugador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-md border bg-muted/40 p-2 text-sm" role="status" aria-live="polite">
              {feedback || "Sin altas nuevas por ahora."}
            </p>
            <ul className="space-y-2">
              {payments.slice(0, 6).map((payment) => (
                <li key={payment.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{payment.playerName}</p>
                    <Badge variant={payment.method === "transferencia" ? "secondary" : "outline"}>
                      {payment.method}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {payment.familyName} · {payment.concept} · {payment.amount} EUR
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:sticky md:inset-auto md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={previousStep} disabled={step === 1}>
            Atrás
          </Button>
          <Button type="button" className="h-11 flex-1" onClick={nextStep} disabled={step === 3}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
