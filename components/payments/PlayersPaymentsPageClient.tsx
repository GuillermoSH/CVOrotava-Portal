"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/club/Badge";
import { FormDate, FormInput, FormSelect, FormTextarea } from "@/components/club/forms";
import { Input } from "@/components/club/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { TableActionsCell, TableTextAction } from "@/components/club/TableActions";
import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { registerPaymentAction } from "@/lib/actions/payments/register";
import { appRoutes } from "@/lib/constants";
import {
  OTHER_CONCEPT_VALUE,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/payments/constants";
import { pickDefaultConceptId } from "@/lib/payments/concept-selection";
import type { PaymentConcept, PlayerListItem } from "@/lib/types/db";
import { appToast } from "@/lib/toast";

type FormState = {
  playerId: string;
  playerName: string;
  /** id de payment_concepts, o OTHER_CONCEPT_VALUE para concepto/importe libres. */
  selectedConceptId: string;
  concept: string;
  amount: string;
  paid_date: string;
  method: (typeof PAYMENT_METHODS)[number];
  notes: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(player: PlayerListItem, concepts: PaymentConcept[]): FormState {
  const defaultId = pickDefaultConceptId(concepts, player);
  const match = concepts.find((c) => c.id === defaultId);
  return {
    playerId: player.id,
    playerName: player.full_name,
    selectedConceptId: defaultId,
    concept: match?.concept ?? "",
    amount: match ? String(match.amount) : "",
    paid_date: todayIso(),
    method: "transferencia",
    notes: "",
  };
}

export function PlayersPaymentsPageClient({
  players,
  season,
  matriculaPaidPlayerIds,
  paymentConcepts,
}: {
  players: PlayerListItem[];
  season: string;
  matriculaPaidPlayerIds: string[];
  paymentConcepts: PaymentConcept[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const paidSet = useMemo(() => new Set(matriculaPaidPlayerIds), [matriculaPaidPlayerIds]);

  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const conceptOptions = useMemo(
    () => [
      ...paymentConcepts.map((c) => ({ value: c.id, label: `${c.concept} — ${c.amount} €` })),
      { value: OTHER_CONCEPT_VALUE, label: "Otro" },
    ],
    [paymentConcepts],
  );

  const visiblePlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => {
      if (onlyMissing && paidSet.has(p.id)) return false;
      if (!q) return true;
      const haystack = [p.full_name, p.team?.name ?? ""].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [players, query, onlyMissing, paidSet]);

  const missingCount = players.filter((p) => !paidSet.has(p.id)).length;

  function openRegister(player: PlayerListItem) {
    setForm(emptyForm(player, paymentConcepts));
    setFormError(null);
    setFormOpen(true);
  }

  function selectConcept(id: string) {
    if (id === OTHER_CONCEPT_VALUE) {
      setForm((f) => (f ? { ...f, selectedConceptId: id, concept: "" } : f));
      return;
    }
    const match = paymentConcepts.find((c) => c.id === id);
    setForm((f) =>
      f
        ? {
            ...f,
            selectedConceptId: id,
            concept: match?.concept ?? "",
            amount: match ? String(match.amount) : f.amount,
          }
        : f,
    );
  }

  function submit() {
    if (!form) return;
    const concept = form.concept.trim();
    if (!concept) {
      setFormError("Indica el concepto");
      return;
    }
    const amountNumber = Number(form.amount.replace(",", "."));
    startTransition(async () => {
      const result = await registerPaymentAction({
        player_id: form.playerId,
        concept,
        amount: amountNumber,
        paid_date: form.paid_date,
        method: form.method,
        notes: form.notes.trim() || undefined,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      appToast.success(`Pago registrado — ${form.playerName}`);
      setFormOpen(false);
      setForm(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {missingCount} sin matrícula · {players.length} jugadores · temporada {season}
          </p>
          <Link href={appRoutes.payments.concepts} className="text-sm text-brand hover:underline">
            Gestionar predefinidos
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugador…"
            aria-label="Buscar jugador"
            className="min-h-11 sm:max-w-xs"
          />
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--club-border)] accent-brand"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
            />
            Solo sin matrícula
          </label>
        </div>

        {visiblePlayers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
            <p className="font-medium text-foreground">Ningún jugador coincide</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2.5 md:hidden">
              {visiblePlayers.map((player) => {
                const paid = paidSet.has(player.id);
                return (
                  <div
                    key={player.id}
                    className="clothing-list-card flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{player.full_name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {player.team?.name ?? "Sin equipo"}
                        </span>
                        <Badge variant={paid ? "success" : "warning"} className="text-[10px]">
                          {paid ? "Matrícula pagada" : "Matrícula pendiente"}
                        </Badge>
                      </div>
                    </div>
                    <TableTextAction label="Registrar pago" onClick={() => openRegister(player)} />
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <div className="glass-panel overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jugador</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead className="club-table__actions">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePlayers.map((player) => {
                      const paid = paidSet.has(player.id);
                      return (
                        <TableRow key={player.id}>
                          <TableCell>
                            <p className="club-table__primary">{player.full_name}</p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {player.team?.name ?? "Sin equipo"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={paid ? "success" : "warning"} className="text-[11px]">
                              {paid ? "Pagada" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableActionsCell>
                            <TableTextAction
                              label="Registrar pago"
                              onClick={() => openRegister(player)}
                            />
                          </TableActionsCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>

      {form ? (
        <ClothingBottomSheet
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={`Registrar pago — ${form.playerName}`}
          description="Anota un cobro ya recibido (transferencia o efectivo). No es una pasarela de pago."
          primaryAction={{
            label: "Registrar pago",
            pending,
            disabled: !form.amount.trim() || !form.paid_date,
            onClick: submit,
          }}
          secondaryAction={{ label: "Cancelar", onClick: () => setFormOpen(false) }}
        >
          <div className="flex flex-col gap-4">
            {formError ? (
              <div
                className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {formError}
              </div>
            ) : null}
            <FormSelect
              label="Concepto"
              name="payment-concept"
              id="payment-concept"
              value={form.selectedConceptId}
              onChange={(e) => selectConcept(e.target.value)}
              options={conceptOptions}
            />
            {form.selectedConceptId === OTHER_CONCEPT_VALUE ? (
              <FormInput
                label="Concepto (texto libre)"
                name="payment-concept-custom"
                id="payment-concept-custom"
                className="min-h-11"
                value={form.concept}
                onChange={(e) => setForm((f) => (f ? { ...f, concept: e.target.value } : f))}
                placeholder="Ej. Material de temporada"
              />
            ) : null}
            <FormInput
              label="Importe (€)"
              name="payment-amount"
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              className="min-h-11"
              value={form.amount}
              onChange={(e) => setForm((f) => (f ? { ...f, amount: e.target.value } : f))}
              placeholder="45"
            />
            <FormDate
              label="Fecha de cobro"
              name="payment-paid-date"
              id="payment-paid-date"
              value={form.paid_date}
              onChange={(e) => setForm((f) => (f ? { ...f, paid_date: e.target.value } : f))}
            />
            <FormSelect
              label="Método"
              name="payment-method"
              id="payment-method"
              value={form.method}
              onChange={(e) =>
                setForm((f) =>
                  f ? { ...f, method: e.target.value as FormState["method"] } : f,
                )
              }
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
            />
            <FormTextarea
              label="Notas"
              name="payment-notes"
              id="payment-notes"
              className="min-h-[4.5rem] resize-none"
              value={form.notes}
              onChange={(e) => setForm((f) => (f ? { ...f, notes: e.target.value } : f))}
              placeholder="Opcional"
              rows={2}
            />
          </div>
        </ClothingBottomSheet>
      ) : null}
    </>
  );
}
