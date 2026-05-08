"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type QuickDraft = {
  concept: string;
  amount: string;
  method: ShowcasePaymentMethod;
};

export default function AdminPaymentsMeiPage() {
  const [query, setQuery] = React.useState("");
  const [activePlayerId, setActivePlayerId] = React.useState<string | null>(null);
  const [payments, setPayments] = React.useState<ShowcasePayment[]>(showcasePaymentsSeed);
  const [feedback, setFeedback] = React.useState("Listo para registrar pagos rápidos.");
  const [drafts, setDrafts] = React.useState<Record<string, QuickDraft>>({});

  const visiblePlayers = React.useMemo(() => filterPlayers(showcasePlayers, query), [query]);

  React.useEffect(() => {
    if (!activePlayerId && visiblePlayers[0]) {
      setActivePlayerId(visiblePlayers[0].id);
    }
  }, [activePlayerId, visiblePlayers]);

  function getDraft(playerId: string): QuickDraft {
    return (
      drafts[playerId] ?? {
        concept: showcasePaymentConcepts[0],
        amount: "45",
        method: "transferencia",
      }
    );
  }

  function updateDraft(playerId: string, update: Partial<QuickDraft>) {
    setDrafts((current) => ({
      ...current,
      [playerId]: {
        ...getDraft(playerId),
        ...update,
      },
    }));
  }

  function addQuickPayment(playerId: string) {
    const player = showcasePlayers.find((item) => item.id === playerId);
    if (!player) return;

    const draft = getDraft(playerId);
    const amount = parseAmount(draft.amount);
    if (!amount) {
      setFeedback(`Importe no válido para ${player.name}.`);
      return;
    }

    const payment = buildMockPayment({
      player,
      concept: draft.concept,
      amount,
      method: draft.method,
      note: "",
    });
    setPayments((current) => [payment, ...current]);
    setFeedback(`Pago rápido añadido para ${player.name}.`);
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">MEI · Bandeja operativa rápida</h2>
        <p className="text-sm text-muted-foreground">
          Diseño orientado a registrar muchos pagos seguidos desde móvil.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Registro express</CardTitle>
          <CardDescription>Busca, toca jugador, confirma pago en 2 acciones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mei-search">Buscar jugador o familia</Label>
            <Input
              id="mei-search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Ej: Carla, Benitez, Cadete"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setQuery("Infantil")}>
              Infantil
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setQuery("Familia")}>
              Familias
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setQuery("")}>
              Limpiar
            </Button>
          </div>

          <ul className="space-y-2">
            {visiblePlayers.map((player) => {
              const isOpen = activePlayerId === player.id;
              const draft = getDraft(player.id);
              return (
                <li key={player.id} className="rounded-lg border p-2">
                  <button
                    type="button"
                    onClick={() => setActivePlayerId(isOpen ? null : player.id)}
                    className="w-full text-left"
                  >
                    <p className="font-medium">{player.name}</p>
                    <p className="text-xs text-muted-foreground">{player.familyName} · {player.team}</p>
                  </button>

                  {isOpen ? (
                    <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={draft.concept}
                          onChange={(event) => updateDraft(player.id, { concept: event.currentTarget.value })}
                          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                        >
                          {showcasePaymentConcepts.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <Input
                          inputMode="decimal"
                          value={draft.amount}
                          onChange={(event) => updateDraft(player.id, { amount: event.currentTarget.value })}
                          aria-label={`Importe para ${player.name}`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={draft.method === "transferencia" ? "default" : "outline"}
                          onClick={() => updateDraft(player.id, { method: "transferencia" })}
                        >
                          Transferencia
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={draft.method === "efectivo" ? "default" : "outline"}
                          onClick={() => updateDraft(player.id, { method: "efectivo" })}
                        >
                          Efectivo
                        </Button>
                        <Button type="button" size="sm" onClick={() => addQuickPayment(player.id)}>
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos registros</CardTitle>
          <CardDescription>Lista compacta para control rápido en pista.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="rounded-md border bg-muted/40 p-2 text-sm" role="status" aria-live="polite">
            {feedback}
          </p>
          <ul className="space-y-2">
            {payments.slice(0, 8).map((payment) => (
              <li key={payment.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{payment.playerName}</p>
                  <Badge variant={payment.method === "transferencia" ? "secondary" : "outline"}>
                    {payment.method}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {payment.concept} · {payment.amount} EUR · {payment.familyName}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
