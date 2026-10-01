"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/club/Badge";
import { FormDate, FormInput, FormSelect, FormTextarea } from "@/components/club/forms";
import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import { SegmentedControl } from "@/components/club/SegmentedControl";
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
import {
  registerBulkPaymentsAction,
  registerPaymentAction,
} from "@/lib/actions/payments/register";
import { appRoutes } from "@/lib/constants";
import {
  OTHER_CONCEPT_VALUE,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/payments/constants";
import { pickDefaultConceptId } from "@/lib/payments/concept-selection";
import type { PaymentConcept, PlayerListItem } from "@/lib/types/db";
import { appToast } from "@/lib/toast";

type PaymentFieldsState = {
  /** id de payment_concepts, o OTHER_CONCEPT_VALUE para concepto/importe libres. */
  selectedConceptId: string;
  concept: string;
  amount: string;
  paid_date: string;
  method: (typeof PAYMENT_METHODS)[number];
  notes: string;
};

type SingleFormState = PaymentFieldsState & { playerId: string; playerName: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyPaymentFields(defaultConceptId: string, concepts: PaymentConcept[]): PaymentFieldsState {
  const match = concepts.find((c) => c.id === defaultConceptId);
  return {
    selectedConceptId: defaultConceptId,
    concept: match?.concept ?? "",
    amount: match ? String(match.amount) : "",
    paid_date: todayIso(),
    method: "transferencia",
    notes: "",
  };
}

function applyConceptSelection(
  id: string,
  concepts: PaymentConcept[],
  prev: PaymentFieldsState,
): PaymentFieldsState {
  if (id === OTHER_CONCEPT_VALUE) return { ...prev, selectedConceptId: id, concept: "" };
  const match = concepts.find((c) => c.id === id);
  return {
    ...prev,
    selectedConceptId: id,
    concept: match?.concept ?? "",
    amount: match ? String(match.amount) : prev.amount,
  };
}

/** Campos compartidos entre el formulario individual y el registro en bloque. */
function PaymentFormFields({
  idPrefix,
  fields,
  concepts,
  conceptOptions,
  onChange,
}: {
  idPrefix: string;
  fields: PaymentFieldsState;
  concepts: PaymentConcept[];
  conceptOptions: { value: string; label: string }[];
  onChange: (next: PaymentFieldsState) => void;
}) {
  const amountLocked = fields.selectedConceptId !== OTHER_CONCEPT_VALUE;
  return (
    <div className="flex flex-col gap-4">
      <FormSelect
        label="Concepto"
        name={`${idPrefix}-concept`}
        id={`${idPrefix}-concept`}
        value={fields.selectedConceptId}
        onChange={(e) => onChange(applyConceptSelection(e.target.value, concepts, fields))}
        options={conceptOptions}
      />
      {fields.selectedConceptId === OTHER_CONCEPT_VALUE ? (
        <FormInput
          label="Concepto (texto libre)"
          name={`${idPrefix}-concept-custom`}
          id={`${idPrefix}-concept-custom`}
          className="min-h-11"
          value={fields.concept}
          onChange={(e) => onChange({ ...fields, concept: e.target.value })}
          placeholder="Ej. Material de temporada"
        />
      ) : null}
      <FormInput
        label="Importe (€)"
        name={`${idPrefix}-amount`}
        id={`${idPrefix}-amount`}
        type="number"
        min="0"
        step="0.01"
        className="min-h-11"
        value={fields.amount}
        onChange={(e) => onChange({ ...fields, amount: e.target.value })}
        placeholder="45"
        disabled={amountLocked}
      />
      <FormDate
        label="Fecha de cobro"
        name={`${idPrefix}-paid-date`}
        id={`${idPrefix}-paid-date`}
        value={fields.paid_date}
        onChange={(e) => onChange({ ...fields, paid_date: e.target.value })}
      />
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium text-foreground">Método</Label>
        <SegmentedControl
          aria-label="Método de pago"
          fullWidth
          value={fields.method}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
          onChange={(value) => onChange({ ...fields, method: value })}
        />
      </div>
      <FormTextarea
        label="Notas"
        name={`${idPrefix}-notes`}
        id={`${idPrefix}-notes`}
        className="min-h-[4.5rem] resize-none"
        value={fields.notes}
        onChange={(e) => onChange({ ...fields, notes: e.target.value })}
        placeholder="Opcional"
        rows={2}
      />
    </div>
  );
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
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SingleFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFields, setBulkFields] = useState<PaymentFieldsState | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

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

  const allVisibleSelected =
    visiblePlayers.length > 0 && visiblePlayers.every((p) => selected.has(p.id));
  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;
  const someVisibleSelected = hasSelection && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const p of visiblePlayers) next.delete(p.id);
      } else {
        for (const p of visiblePlayers) next.add(p.id);
      }
      return next;
    });
  }

  function openRegister(player: PlayerListItem) {
    const defaultId = pickDefaultConceptId(paymentConcepts, player);
    setForm({
      playerId: player.id,
      playerName: player.full_name,
      ...emptyPaymentFields(defaultId, paymentConcepts),
    });
    setFormError(null);
    setFormOpen(true);
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

  function openBulkRegister() {
    if (selectedCount === 0) return;
    const defaultId = pickDefaultConceptId(paymentConcepts, { pays_extended_monthly: false });
    setBulkFields(emptyPaymentFields(defaultId, paymentConcepts));
    setBulkError(null);
    setBulkOpen(true);
  }

  function submitBulk() {
    if (!bulkFields || selectedCount === 0) return;
    const concept = bulkFields.concept.trim();
    if (!concept) {
      setBulkError("Indica el concepto");
      return;
    }
    const amountNumber = Number(bulkFields.amount.replace(",", "."));
    const ids = [...selected];
    startTransition(async () => {
      const result = await registerBulkPaymentsAction({
        player_ids: ids,
        concept,
        amount: amountNumber,
        paid_date: bulkFields.paid_date,
        method: bulkFields.method,
        notes: bulkFields.notes.trim() || undefined,
      });
      if (!result.ok) {
        setBulkError(result.error);
        return;
      }
      appToast.success(
        `${result.created} pago${result.created === 1 ? "" : "s"} registrado${result.created === 1 ? "" : "s"}`,
      );
      setBulkOpen(false);
      setBulkFields(null);
      setSelected(new Set());
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

        <div
          className={
            hasSelection
              ? "sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color-mix(in_srgb,var(--club-brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--club-brand-soft)_40%,var(--club-drawer-bg))] px-2.5 py-2 shadow-[var(--club-shadow-card)] max-md:static max-md:shadow-none"
              : "hidden"
          }
        >
          <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                ref={selectAllRef}
                type="checkbox"
                className="size-4 rounded border-[var(--club-border)] accent-brand"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                aria-label="Seleccionar todos los visibles"
              />
              <span className="text-sm font-medium text-foreground">
                <span className="tabular-nums">{selectedCount}</span> seleccionado
                {selectedCount === 1 ? "" : "s"}
              </span>
            </label>
            <button
              type="button"
              className="min-h-8 cursor-pointer touch-manipulation rounded-lg px-2 text-xs font-medium text-[var(--club-fg-muted)] transition-colors hover:bg-[var(--club-surface-hover)] hover:text-foreground"
              onClick={() => setSelected(new Set())}
            >
              Quitar selección
            </button>
          </div>
          <button type="button" className="btn-primary min-h-9 text-xs" onClick={openBulkRegister}>
            Registrar pago en bloque
          </button>
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
                    className="clothing-list-card flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 rounded border-[var(--club-border)] accent-brand"
                      checked={selected.has(player.id)}
                      onChange={() => toggleSelect(player.id)}
                      aria-label={`Seleccionar ${player.full_name}`}
                    />
                    <div className="min-w-0 flex-1">
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
                      <TableHead className="w-10">
                        <span className="sr-only">Seleccionar</span>
                      </TableHead>
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
                            <input
                              type="checkbox"
                              className="size-4 rounded border-[var(--club-border)] accent-brand"
                              checked={selected.has(player.id)}
                              onChange={() => toggleSelect(player.id)}
                              aria-label={`Seleccionar ${player.full_name}`}
                            />
                          </TableCell>
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
            <PaymentFormFields
              idPrefix="payment"
              fields={form}
              concepts={paymentConcepts}
              conceptOptions={conceptOptions}
              onChange={(next) => setForm((f) => (f ? { ...f, ...next } : f))}
            />
          </div>
        </ClothingBottomSheet>
      ) : null}

      {bulkFields ? (
        <ClothingBottomSheet
          open={bulkOpen}
          onClose={() => {
            if (!pending) setBulkOpen(false);
          }}
          title={`Registrar pago — ${selectedCount} jugador${selectedCount === 1 ? "" : "es"}`}
          description="El mismo concepto, importe, fecha y método se anota para todos los seleccionados."
          primaryAction={{
            label: "Registrar pagos",
            pending,
            disabled: !bulkFields.amount.trim() || !bulkFields.paid_date || selectedCount === 0,
            onClick: submitBulk,
          }}
          secondaryAction={{
            label: "Cancelar",
            onClick: () => {
              if (!pending) setBulkOpen(false);
            },
            disabled: pending,
          }}
        >
          <div className="flex flex-col gap-4">
            {bulkError ? (
              <div
                className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {bulkError}
              </div>
            ) : null}
            <PaymentFormFields
              idPrefix="bulk-payment"
              fields={bulkFields}
              concepts={paymentConcepts}
              conceptOptions={conceptOptions}
              onChange={(next) => setBulkFields(next)}
            />
          </div>
        </ClothingBottomSheet>
      ) : null}
    </>
  );
}
