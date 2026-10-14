"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { FormDate, FormInput, FormSelect, FormTextarea } from "@/components/club/forms";
import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import { SegmentedControl } from "@/components/club/SegmentedControl";
import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { FlashPaymentSheet } from "@/components/payments/FlashPaymentSheet";
import { MethodMark } from "@/components/payments/MethodMark";
import { PaymentMatrix } from "@/components/payments/PaymentMatrix";
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
import {
  monthName,
  obligationConcept,
  openObligations,
  type FeeObligation,
} from "@/lib/payments/fees";
import { buildMatrixColumns } from "@/lib/payments/matrix";
import type { PlayerFeeRow } from "@/lib/payments/player-fee-rows";
import { appToast } from "@/lib/toast";

type CommonFields = {
  paid_date: string;
  method: (typeof PAYMENT_METHODS)[number];
  notes: string;
};

type SingleForm = CommonFields & {
  playerId: string;
  playerName: string;
  /** key de la obligación elegida, u OTHER_CONCEPT_VALUE. */
  selectedKey: string;
  customConcept: string;
  amount: string;
};

type BulkForm = CommonFields & {
  /** code de la línea elegida, u OTHER_CONCEPT_VALUE. */
  lineCode: string;
  month: string;
  customConcept: string;
  /** Importe único opcional; vacío = cada jugador paga su resto. */
  amount: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatEuros(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(".", ",")} €`;
}

function parseAmount(raw: string): number {
  return Number(raw.replace(",", "."));
}

function obligationOptionLabel(o: FeeObligation): string {
  const partial = o.paid > 0 ? " · resto" : "";
  return `${obligationConcept(o)} — ${formatEuros(o.remaining)}${partial}`;
}

/** Vencidas primero (ya vienen en orden de tarifa), luego los meses por llegar. */
function sortOpen(obligations: readonly FeeObligation[]): FeeObligation[] {
  const open = openObligations(obligations);
  return [...open.filter((o) => o.overdue), ...open.filter((o) => !o.overdue)];
}

function CommonPaymentFields({
  idPrefix,
  fields,
  onChange,
}: {
  idPrefix: string;
  fields: CommonFields;
  onChange: (next: Partial<CommonFields>) => void;
}) {
  return (
    <>
      <FormDate
        label="Fecha de cobro"
        name={`${idPrefix}-paid-date`}
        id={`${idPrefix}-paid-date`}
        value={fields.paid_date}
        onChange={(e) => onChange({ paid_date: e.target.value })}
      />
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium text-foreground">Método</Label>
        <SegmentedControl
          aria-label="Método de pago"
          fullWidth
          value={fields.method}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
          onChange={(value) => onChange({ method: value })}
        />
      </div>
      <FormTextarea
        label="Notas"
        name={`${idPrefix}-notes`}
        id={`${idPrefix}-notes`}
        className="min-h-[4.5rem] resize-none"
        value={fields.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Opcional"
        rows={2}
      />
    </>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
      role="alert"
    >
      {message}
    </div>
  );
}

export function PlayersPaymentsPageClient({
  rows,
  season,
  hasFees,
}: {
  rows: PlayerFeeRow[];
  season: string;
  hasFees: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [sessionDate, setSessionDate] = useState(todayIso);
  const [flashOpen, setFlashOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SingleForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<BulkForm | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const rowById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  const overdueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of rows) {
      if (row.obligations.some((o) => o.overdue && o.remaining > 0)) ids.add(row.id);
    }
    return ids;
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (onlyPending && !overdueIds.has(row.id)) return false;
      if (!q) return true;
      return [row.full_name, row.team_name ?? ""].join(" ").toLowerCase().includes(q);
    });
  }, [rows, query, onlyPending, overdueIds]);

  const columns = useMemo(() => buildMatrixColumns(visibleRows), [visibleRows]);

  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selected.has(row.id));
  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;
  const someVisibleSelected = hasSelection && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const row of visibleRows) next.delete(row.id);
      } else {
        for (const row of visibleRows) next.add(row.id);
      }
      return next;
    });
  }

  /* ───────────── Registro individual ───────────── */

  const formOptions = useMemo(() => {
    if (!form) return [];
    const row = rowById.get(form.playerId);
    return row ? sortOpen(row.obligations) : [];
  }, [form, rowById]);

  const formConceptOptions = useMemo(
    () => [
      ...formOptions.map((o) => ({ value: o.key, label: obligationOptionLabel(o) })),
      { value: OTHER_CONCEPT_VALUE, label: "Otro" },
    ],
    [formOptions],
  );

  const selectedObligation = form
    ? (formOptions.find((o) => o.key === form.selectedKey) ?? null)
    : null;

  const openRegister = useCallback((row: PlayerFeeRow) => {
    const first = sortOpen(row.obligations)[0] ?? null;
    setForm({
      playerId: row.id,
      playerName: row.full_name,
      selectedKey: first?.key ?? OTHER_CONCEPT_VALUE,
      customConcept: "",
      amount: first ? String(first.remaining) : "",
      paid_date: todayIso(),
      method: "transferencia",
      notes: "",
    });
    setFormError(null);
    setFormOpen(true);
  }, []);

  function changeSingleConcept(key: string) {
    setForm((f) => {
      if (!f) return f;
      if (key === OTHER_CONCEPT_VALUE) return { ...f, selectedKey: key, amount: "" };
      const match = formOptions.find((o) => o.key === key);
      return { ...f, selectedKey: key, amount: match ? String(match.remaining) : f.amount };
    });
  }

  function submit() {
    if (!form) return;
    const concept = selectedObligation
      ? obligationConcept(selectedObligation)
      : form.customConcept.trim();
    if (!concept) {
      setFormError("Indica el concepto");
      return;
    }
    startTransition(async () => {
      const result = await registerPaymentAction({
        player_id: form.playerId,
        concept,
        amount: parseAmount(form.amount),
        paid_date: form.paid_date,
        method: form.method,
        notes: form.notes.trim() || undefined,
        fee_code: selectedObligation?.code ?? null,
        billing_month: selectedObligation?.month ?? null,
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

  /* ───────────── Registro en bloque ───────────── */

  /** Líneas (code) con algo abierto entre los seleccionados, en orden de aparición. */
  const bulkLines = useMemo(() => {
    const lines = new Map<string, { code: string; label: string; kind: "once" | "monthly" }>();
    for (const id of selected) {
      const row = rowById.get(id);
      if (!row) continue;
      for (const o of sortOpen(row.obligations)) {
        if (!lines.has(o.code)) lines.set(o.code, { code: o.code, label: o.label, kind: o.kind });
      }
    }
    return [...lines.values()];
  }, [selected, rowById]);

  const bulkMonths = useMemo(() => {
    if (!bulk) return [];
    const months = new Set<number>();
    for (const id of selected) {
      const row = rowById.get(id);
      if (!row) continue;
      for (const o of openObligations(row.obligations)) {
        if (o.code === bulk.lineCode && o.month != null) months.add(o.month);
      }
    }
    return [...months];
  }, [bulk, selected, rowById]);

  const bulkLine = bulk ? (bulkLines.find((l) => l.code === bulk.lineCode) ?? null) : null;

  /** Qué anotaría cada jugador seleccionado con la línea (y mes) elegidos. */
  const bulkPlan = useMemo(() => {
    if (!bulk || !bulkLine) return null;
    const month = bulkLine.kind === "monthly" ? Number(bulk.month) : null;
    const override = bulk.amount.trim() === "" ? null : parseAmount(bulk.amount);
    const entries: { player_id: string; amount: number }[] = [];
    let skipped = 0;
    let label = bulkLine.label;
    for (const id of selected) {
      const row = rowById.get(id);
      const match = row?.obligations.find(
        (o) => o.code === bulkLine.code && o.month === month && o.remaining > 0,
      );
      if (!match) {
        skipped += 1;
        continue;
      }
      label = match.label;
      entries.push({
        player_id: id,
        amount: override != null && Number.isFinite(override) ? override : match.remaining,
      });
    }
    return { entries, skipped, month, label };
  }, [bulk, bulkLine, selected, rowById]);

  function openBulkRegister() {
    if (selectedCount === 0) return;
    const firstLine = bulkLines[0] ?? null;
    let month = "";
    if (firstLine?.kind === "monthly") {
      const months = new Map<number, boolean>();
      for (const id of selected) {
        for (const o of openObligations(rowById.get(id)?.obligations ?? [])) {
          if (o.code !== firstLine.code || o.month == null) continue;
          months.set(o.month, (months.get(o.month) ?? false) || o.overdue);
        }
      }
      const overdue = [...months.entries()].find(([, isOverdue]) => isOverdue);
      const first = overdue?.[0] ?? [...months.keys()][0];
      month = first != null ? String(first) : "";
    }
    setBulk({
      lineCode: firstLine?.code ?? OTHER_CONCEPT_VALUE,
      month,
      customConcept: "",
      amount: "",
      paid_date: todayIso(),
      method: "transferencia",
      notes: "",
    });
    setBulkError(null);
    setBulkOpen(true);
  }

  function changeBulkLine(code: string) {
    setBulk((b) => {
      if (!b) return b;
      const line = bulkLines.find((l) => l.code === code);
      let month = "";
      if (line?.kind === "monthly") {
        const months: number[] = [];
        for (const id of selected) {
          for (const o of openObligations(rowById.get(id)?.obligations ?? [])) {
            if (o.code === code && o.month != null && !months.includes(o.month)) months.push(o.month);
          }
        }
        month = months[0] != null ? String(months[0]) : "";
      }
      return { ...b, lineCode: code, month, amount: "" };
    });
  }

  function submitBulk() {
    if (!bulk || selectedCount === 0) return;
    const isOther = bulk.lineCode === OTHER_CONCEPT_VALUE;

    if (isOther) {
      const concept = bulk.customConcept.trim();
      const amount = parseAmount(bulk.amount);
      if (!concept) {
        setBulkError("Indica el concepto");
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        setBulkError("Indica el importe");
        return;
      }
      runBulk(
        {
          entries: [...selected].map((id) => ({ player_id: id, amount })),
          concept,
          fee_code: null,
          billing_month: null,
        },
        bulk,
      );
      return;
    }

    if (!bulkPlan || bulkPlan.entries.length === 0) {
      setBulkError("Ningún jugador seleccionado tiene esto pendiente");
      return;
    }
    runBulk(
      {
        entries: bulkPlan.entries,
        concept: obligationConcept({ label: bulkPlan.label, month: bulkPlan.month }),
        fee_code: bulk.lineCode,
        billing_month: bulkPlan.month,
      },
      bulk,
    );
  }

  function runBulk(
    payload: {
      entries: { player_id: string; amount: number }[];
      concept: string;
      fee_code: string | null;
      billing_month: number | null;
    },
    fields: BulkForm,
  ) {
    startTransition(async () => {
      const result = await registerBulkPaymentsAction({
        ...payload,
        paid_date: fields.paid_date,
        method: fields.method,
        notes: fields.notes.trim() || undefined,
      });
      if (!result.ok) {
        setBulkError(result.error);
        return;
      }
      appToast.success(
        `${result.created} pago${result.created === 1 ? "" : "s"} registrado${result.created === 1 ? "" : "s"}`,
      );
      setBulkOpen(false);
      setBulk(null);
      setSelected(new Set());
      router.refresh();
    });
  }

  const bulkIsOther = bulk?.lineCode === OTHER_CONCEPT_VALUE;
  const bulkLineOptions = [
    ...bulkLines.map((l) => ({ value: l.code, label: l.label })),
    { value: OTHER_CONCEPT_VALUE, label: "Otro" },
  ];
  const bulkPrimaryDisabled =
    !bulk ||
    !bulk.paid_date ||
    selectedCount === 0 ||
    (bulkIsOther
      ? !bulk.amount.trim() || !bulk.customConcept.trim()
      : !bulkPlan || bulkPlan.entries.length === 0);

  const pendingCount = overdueIds.size;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-muted-foreground">
            {`${pendingCount} con pendiente · ${rows.length} jugadores · temporada ${season}`}
          </p>
          <div className="flex items-center gap-3">
            <Link href={appRoutes.payments.fees} className="text-sm text-brand hover:underline">
              Tarifas
            </Link>
            <button
              type="button"
              className="btn-primary min-h-10"
              onClick={() => setFlashOpen(true)}
            >
              Cobro rápido
            </button>
          </div>
        </div>

        {!hasFees ? (
          <div className="rounded-lg border border-dashed border-[var(--club-border)] px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Esta temporada no tiene tarifa</p>
            <p className="mt-0.5 text-muted-foreground">
              Sin tarifa no se calcula qué falta por cobrar.{" "}
              <Link href={appRoutes.payments.fees} className="text-brand hover:underline">
                Configurarla
              </Link>
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugador…"
            aria-label="Buscar jugador"
            className="min-h-11 sm:max-w-xs"
          />
          <label className="flex w-fit items-center gap-2 text-sm">
            <span className="text-muted-foreground">Fecha de cobro</span>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value || todayIso())}
              className="min-h-11 rounded-lg border border-[var(--club-border)] bg-[var(--club-surface)] px-2.5 text-sm"
              aria-label="Fecha de cobro de esta sesión"
            />
          </label>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--club-border)] accent-brand"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
            />
            Solo con pendiente
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

        {visibleRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
            <p className="font-medium text-foreground">Ningún jugador coincide</p>
          </div>
        ) : (
          <>
            <PaymentMatrix
              rows={visibleRows}
              columns={columns}
              selected={selected}
              allSelected={allVisibleSelected}
              someSelected={someVisibleSelected}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleSelectAllVisible}
              sessionDate={sessionDate}
              onOther={openRegister}
              selectAllRef={selectAllRef}
            />
            <div className="pay-legend" aria-label="Leyenda de la matriz">
              <span className="pay-legend__item">
                <span className="pay-cell pay-cell--paid">
                  <MethodMark method="transferencia" iconClassName="size-3" />
                </span>
                transferencia
              </span>
              <span className="pay-legend__item">
                <span className="pay-cell pay-cell--paid">
                  <MethodMark method="efectivo" iconClassName="size-3" />
                </span>
                efectivo
              </span>
              <span className="pay-legend__item">
                <span className="pay-cell pay-cell--partial">10</span>
                parcial
              </span>
              <span className="pay-legend__item">
                <span className="pay-cell pay-cell--due">25</span>
                vencido
              </span>
              <span className="pay-legend__item">
                <span className="pay-cell pay-cell--upcoming">25</span>
                por llegar
              </span>
            </div>
          </>
        )}
      </div>

      <FlashPaymentSheet
        open={flashOpen}
        onClose={() => setFlashOpen(false)}
        rows={rows}
        sessionDate={sessionDate}
      />

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
            <ErrorBanner message={formError} />
            <FormSelect
              label="Qué se cobra"
              name="payment-concept"
              id="payment-concept"
              value={form.selectedKey}
              onChange={(e) => changeSingleConcept(e.target.value)}
              options={formConceptOptions}
            />
            {form.selectedKey === OTHER_CONCEPT_VALUE ? (
              <FormInput
                label="Concepto (texto libre)"
                name="payment-concept-custom"
                id="payment-concept-custom"
                className="min-h-11"
                value={form.customConcept}
                onChange={(e) => setForm((f) => (f ? { ...f, customConcept: e.target.value } : f))}
                placeholder="Ej. Material de temporada"
              />
            ) : null}
            <div className="flex flex-col gap-1.5">
              <FormInput
                label="Importe (€)"
                name="payment-amount"
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="min-h-11"
                value={form.amount}
                onChange={(e) => setForm((f) => (f ? { ...f, amount: e.target.value } : f))}
                placeholder="45"
              />
              {selectedObligation && form.amount.trim() ? (
                <AmountHint
                  amount={parseAmount(form.amount)}
                  remaining={selectedObligation.remaining}
                />
              ) : null}
            </div>
            <CommonPaymentFields
              idPrefix="payment"
              fields={form}
              onChange={(next) => setForm((f) => (f ? { ...f, ...next } : f))}
            />
          </div>
        </ClothingBottomSheet>
      ) : null}

      {bulk ? (
        <ClothingBottomSheet
          open={bulkOpen}
          onClose={() => {
            if (!pending) setBulkOpen(false);
          }}
          title={`Registrar pago — ${selectedCount} jugador${selectedCount === 1 ? "" : "es"}`}
          description="Cada jugador anota su resto; si ya lo tiene cubierto, se salta."
          primaryAction={{
            label: bulkPlan && !bulkIsOther
              ? `Registrar ${bulkPlan.entries.length} pago${bulkPlan.entries.length === 1 ? "" : "s"}`
              : "Registrar pagos",
            pending,
            disabled: bulkPrimaryDisabled,
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
            <ErrorBanner message={bulkError} />
            <FormSelect
              label="Qué se cobra"
              name="bulk-payment-line"
              id="bulk-payment-line"
              value={bulk.lineCode}
              onChange={(e) => changeBulkLine(e.target.value)}
              options={bulkLineOptions}
            />
            {bulkLine?.kind === "monthly" ? (
              <FormSelect
                label="Mes"
                name="bulk-payment-month"
                id="bulk-payment-month"
                value={bulk.month}
                onChange={(e) => setBulk((b) => (b ? { ...b, month: e.target.value } : b))}
                options={bulkMonths.map((month) => ({
                  value: String(month),
                  label: monthName(month),
                }))}
              />
            ) : null}
            {bulkIsOther ? (
              <FormInput
                label="Concepto (texto libre)"
                name="bulk-payment-custom"
                id="bulk-payment-custom"
                className="min-h-11"
                value={bulk.customConcept}
                onChange={(e) => setBulk((b) => (b ? { ...b, customConcept: e.target.value } : b))}
                placeholder="Ej. Material de temporada"
              />
            ) : null}
            <div className="flex flex-col gap-1.5">
              <FormInput
                label={bulkIsOther ? "Importe (€)" : "Importe único (€) — opcional"}
                name="bulk-payment-amount"
                id="bulk-payment-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="min-h-11"
                value={bulk.amount}
                onChange={(e) => setBulk((b) => (b ? { ...b, amount: e.target.value } : b))}
                placeholder={bulkIsOther ? "45" : "Cada jugador, su resto"}
              />
              {!bulkIsOther && bulkPlan ? (
                <p className="text-xs text-muted-foreground">
                  {`${bulkPlan.entries.length} jugador${bulkPlan.entries.length === 1 ? "" : "es"} por anotar`}
                  {bulkPlan.skipped > 0
                    ? ` · ${bulkPlan.skipped} ya lo tiene${bulkPlan.skipped === 1 ? "" : "n"} cubierto o no le aplica`
                    : ""}
                </p>
              ) : null}
            </div>
            <CommonPaymentFields
              idPrefix="bulk-payment"
              fields={bulk}
              onChange={(next) => setBulk((b) => (b ? { ...b, ...next } : b))}
            />
          </div>
        </ClothingBottomSheet>
      ) : null}
    </>
  );
}

function AmountHint({ amount, remaining }: { amount: number; remaining: number }) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (amount < remaining) {
    return (
      <p className="text-xs text-muted-foreground">
        {`Quedará pendiente ${formatEuros(remaining - amount)} de este concepto.`}
      </p>
    );
  }
  if (amount > remaining) {
    return (
      <p className="text-xs text-muted-foreground">
        {`Son ${formatEuros(amount - remaining)} más de lo pendiente: se anota tal cual, sin aplicarse a otro pago.`}
      </p>
    );
  }
  return null;
}
