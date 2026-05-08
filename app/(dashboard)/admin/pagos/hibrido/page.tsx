"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  showcaseChargeSeed,
  showcaseFeeGroups,
  showcasePlayerOverrides,
  showcaseSeasonMonths,
  showcasePaymentsSeed,
  showcasePlayers,
  type ShowcaseCharge,
  type ShowcasePayment,
  type ShowcasePaymentMethod,
} from "@/lib/mocks/payments-showcase";
import {
  buildMockPayment,
  formatMonthLabel,
  generateSeasonCharges,
  getPendingCharges,
  parseAmount,
  registerPendingChargePayment,
  requiresRiskConfirmation,
} from "@/lib/payments/showcase-domain";

const UNDO_WINDOW_MS = 6000;

export default function AdminPaymentsHibridoPage() {
  const [charges, setCharges] = React.useState<ShowcaseCharge[]>(() =>
    generateSeasonCharges({
      players: showcasePlayers,
      groups: showcaseFeeGroups,
      overrides: showcasePlayerOverrides,
      months: showcaseSeasonMonths,
      existingCharges: showcaseChargeSeed,
    }),
  );
  const [payments, setPayments] = React.useState<ShowcasePayment[]>(showcasePaymentsSeed);
  const [rowMethods, setRowMethods] = React.useState<Record<string, ShowcasePaymentMethod>>({});
  const [showOthersDialog, setShowOthersDialog] = React.useState(false);
  const [otherPlayerId, setOtherPlayerId] = React.useState(showcasePlayers[0]?.id ?? "");
  const [otherConcept, setOtherConcept] = React.useState("Reserva de ropa");
  const [otherAmount, setOtherAmount] = React.useState("35");
  const [otherMethod, setOtherMethod] = React.useState<ShowcasePaymentMethod>("efectivo");
  const [otherNote, setOtherNote] = React.useState("");
  const [otherPlayerQuery, setOtherPlayerQuery] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmCharge, setConfirmCharge] = React.useState<ShowcaseCharge | null>(null);
  const [confirmMethod, setConfirmMethod] = React.useState<ShowcasePaymentMethod>("transferencia");
  const [toastMessage, setToastMessage] = React.useState("");
  const [undoPayment, setUndoPayment] = React.useState<ShowcasePayment | null>(null);
  const [undoChargeSnapshot, setUndoChargeSnapshot] = React.useState<ShowcaseCharge | null>(null);
  const [undoDeadline, setUndoDeadline] = React.useState<number | null>(null);
  const [toastRunId, setToastRunId] = React.useState(0);
  const [undoProgress, setUndoProgress] = React.useState(100);
  const [pendingFilter, setPendingFilter] = React.useState("");

  const pendingCharges = React.useMemo(() => getPendingCharges(charges), [charges]);
  const visiblePendingCharges = React.useMemo(() => {
    const normalized = pendingFilter.trim().toLowerCase();
    if (!normalized) return pendingCharges;
    return pendingCharges.filter((charge) => {
      return (
        charge.playerName.toLowerCase().includes(normalized) ||
        charge.familyName.toLowerCase().includes(normalized) ||
        charge.monthKey.includes(normalized)
      );
    });
  }, [pendingCharges, pendingFilter]);

  React.useEffect(() => {
    if (!undoDeadline || undoDeadline <= Date.now()) {
      setUndoPayment(null);
      setUndoChargeSnapshot(null);
      setUndoDeadline(null);
      return;
    }

    setUndoProgress(100);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setUndoProgress(0);
      });
    });

    const timer = setTimeout(() => {
      setUndoPayment(null);
      setUndoChargeSnapshot(null);
      setUndoDeadline(null);
    }, Math.max(0, undoDeadline - Date.now()));

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [undoDeadline, toastRunId]);

  function getMethodForCharge(chargeId: string) {
    return rowMethods[chargeId] ?? "transferencia";
  }

  function openConfirmForCharge(charge: ShowcaseCharge) {
    const method = getMethodForCharge(charge.id);
    setConfirmCharge(charge);
    setConfirmMethod(method);
    setConfirmOpen(true);
  }

  function persistPendingChargePayment(chargeId: string, usedMethod: ShowcasePaymentMethod) {
    const snapshot = charges.find((item) => item.id === chargeId) ?? null;
    const result = registerPendingChargePayment({ charges, chargeId, method: usedMethod });
    if (!result.payment || !snapshot) return;
    setCharges(result.charges);
    setPayments((current) => [result.payment as ShowcasePayment, ...current]);
    setUndoPayment(result.payment as ShowcasePayment);
    setUndoChargeSnapshot(snapshot);
    setUndoDeadline(Date.now() + UNDO_WINDOW_MS);
    setToastRunId((current) => current + 1);
    setToastMessage(`Pago guardado para ${result.payment.playerName}.`);
    setRowMethods((current) => {
      const next = { ...current };
      delete next[chargeId];
      return next;
    });
  }

  function confirmSave() {
    if (!confirmCharge) return;
    const previousMethod = payments[0]?.method;
    const risky = requiresRiskConfirmation({
      amount: confirmCharge.amount,
      method: confirmMethod,
      lastMethod: previousMethod,
    });
    // Conserva guardrail de riesgo, pero en este caso el mismo popup ya actúa como confirmación.
    if (risky) {
      setToastMessage("Caso de riesgo confirmado manualmente.");
    }
    persistPendingChargePayment(confirmCharge.id, confirmMethod);
    setConfirmOpen(false);
    setConfirmCharge(null);
  }

  function cancelSave() {
    setConfirmOpen(false);
    setConfirmCharge(null);
  }

  function undoLastSave() {
    if (!undoPayment) return;
    setPayments((current) => current.filter((item) => item.id !== undoPayment.id));
    if (undoChargeSnapshot) {
      setCharges((current) =>
        current.map((charge) => (charge.id === undoChargeSnapshot.id ? undoChargeSnapshot : charge)),
      );
    }
    setToastMessage(`Se deshizo el pago de ${undoPayment.playerName}.`);
    setUndoPayment(null);
    setUndoChargeSnapshot(null);
    setUndoDeadline(null);
  }

  function createOtherPayment() {
    const player = showcasePlayers.find((item) => item.id === otherPlayerId);
    if (!player) return;
    const amount = parseAmount(otherAmount);
    if (!amount) {
      setToastMessage("El importe de 'Nuevo' debe ser mayor que 0.");
      return;
    }

    const payment = buildMockPayment({
      player,
      concept: otherConcept.trim() || "Pago puntual",
      amount,
      method: otherMethod,
      note: otherNote,
    });
    setPayments((current) => [payment, ...current]);
    setUndoPayment(payment);
    setUndoChargeSnapshot(null);
    setUndoDeadline(Date.now() + UNDO_WINDOW_MS);
    setToastRunId((current) => current + 1);
    setShowOthersDialog(false);
    setOtherConcept("Reserva de ropa");
    setOtherAmount("35");
    setOtherMethod("efectivo");
    setOtherNote("");
    setOtherPlayerQuery("");
    setToastMessage(`Pago puntual creado para ${player.name}.`);
  }

  const filteredOtherPlayers = React.useMemo(() => {
    const normalized = otherPlayerQuery.trim().toLowerCase();
    if (!normalized) return showcasePlayers.slice(0, 20);
    return showcasePlayers
      .filter((player) => {
        return (
          player.name.toLowerCase().includes(normalized) ||
          player.familyName.toLowerCase().includes(normalized) ||
          player.team.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 20);
  }, [otherPlayerQuery]);

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col overflow-hidden lg:h-full">
      <Card className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border ring-0">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-0">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="hybrid-search">Buscar pendiente</Label>
              <Input
                id="hybrid-search"
                value={pendingFilter}
                onChange={(event) => setPendingFilter(event.currentTarget.value)}
                placeholder="Jugador, familia o mes (2026-05)"
                autoFocus
              />
            </div>
            <Dialog open={showOthersDialog} onOpenChange={setShowOthersDialog}>
              <DialogTrigger render={<Button type="button" className="h-8" />}>Nuevo</DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nuevo pago puntual</DialogTitle>
                  <DialogDescription>
                    Alta rápida para reservas u otros cobros no planificados.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="other-player-search">Buscar jugador</Label>
                    <Input
                      id="other-player-search"
                      value={otherPlayerQuery}
                      onChange={(event) => setOtherPlayerQuery(event.currentTarget.value)}
                      placeholder="Nombre, familia o equipo"
                    />
                  </div>
                  <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                    {filteredOtherPlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => setOtherPlayerId(player.id)}
                        className={`w-full rounded-md px-2 py-1 text-left text-sm ${
                          otherPlayerId === player.id
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {player.name} · {player.familyName}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="other-concept">Concepto</Label>
                    <Input
                      id="other-concept"
                      value={otherConcept}
                      onChange={(event) => setOtherConcept(event.currentTarget.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="other-amount">Importe</Label>
                      <Input
                        id="other-amount"
                        inputMode="decimal"
                        value={otherAmount}
                        onChange={(event) => setOtherAmount(event.currentTarget.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="other-method">Método</Label>
                      <select
                        id="other-method"
                        value={otherMethod}
                        onChange={(event) => setOtherMethod(event.currentTarget.value as ShowcasePaymentMethod)}
                        className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                      >
                        <option value="transferencia">Transferencia</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="other-note">Nota</Label>
                    <Input
                      id="other-note"
                      value={otherNote}
                      onChange={(event) => setOtherNote(event.currentTarget.value)}
                      placeholder="Opcional"
                    />
                  </div>
                  <Button type="button" className="h-10 w-full" onClick={createOtherPayment}>
                    Guardar nuevo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <ul className="min-h-0 flex-1 space-y-2 overflow-auto pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:pb-0">
            {visiblePendingCharges.map((charge) => (
              <li key={charge.id} className="rounded-lg border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{charge.playerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {charge.familyName} · {charge.concept}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatMonthLabel(charge.monthKey)}</p>
                  </div>
                  <Badge variant="outline">{charge.amount} EUR</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={getMethodForCharge(charge.id) === "transferencia" ? "default" : "outline"}
                    onClick={() =>
                      setRowMethods((current) => ({ ...current, [charge.id]: "transferencia" }))
                    }
                  >
                    Transferencia
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={getMethodForCharge(charge.id) === "efectivo" ? "default" : "outline"}
                    onClick={() => setRowMethods((current) => ({ ...current, [charge.id]: "efectivo" }))}
                  >
                    Efectivo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="ml-auto"
                    onClick={() => openConfirmForCharge(charge)}
                  >
                    Guardar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar pago</DialogTitle>
            <DialogDescription>Comprueba y confirma el registro del pago.</DialogDescription>
          </DialogHeader>
          {confirmCharge ? (
            <div className="space-y-3">
              <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {confirmCharge.playerName} · {confirmCharge.concept} · {formatMonthLabel(confirmCharge.monthKey)}
              </p>
              <p className="text-sm">
                {confirmCharge.amount} EUR · <strong>{confirmMethod}</strong>
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-10 flex-1" onClick={cancelSave}>
                  Cancelar
                </Button>
                <Button type="button" className="h-10 flex-1" onClick={confirmSave}>
                  Guardar
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {undoPayment && undoDeadline ? (
        <div className="fixed right-4 bottom-4 z-50 w-[min(92vw,420px)] rounded-lg border bg-popover p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span>{toastMessage || `Pago guardado para ${undoPayment.playerName}.`}</span>
            <Button type="button" size="sm" variant="outline" onClick={undoLastSave}>
              Deshacer
            </Button>
          </div>
          <div className="h-1 w-full overflow-hidden rounded bg-muted">
            <div
              key={toastRunId}
              className="h-full bg-primary transition-[width] ease-linear"
              style={{ width: `${undoProgress}%`, transitionDuration: `${UNDO_WINDOW_MS}ms` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
