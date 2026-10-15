"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { FormDate, FormInput, FormSelect } from "@/components/club/forms";
import { Label } from "@/components/club/Label";
import { deleteFeeLineAction, saveFeeLineAction } from "@/lib/actions/payments/fees";
import { SEASON_MONTH_ORDER, monthShort } from "@/lib/payments/fees";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { FeeAudience, FeeLineKind, SeasonFeeLine } from "@/lib/types/db";

function slugifyCode(label: string, taken: ReadonlySet<string>): string {
  const base =
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "concepto";
  let code = base;
  let n = 2;
  while (taken.has(code)) {
    code = `${base}_${n}`;
    n += 1;
  }
  return code;
}

function amountToInput(value: number | null): string {
  return value == null ? "" : String(value);
}

/** Edita una línea de tarifa existente o crea una nueva (line = null). */
export function FeeLineEditor({
  season,
  audience,
  line,
  takenCodes,
  onClose,
}: {
  season: string;
  audience: FeeAudience;
  line: SeasonFeeLine | null;
  takenCodes: ReadonlySet<string>;
  /** Solo para la línea nueva: cierra el formulario tras guardar o cancelar. */
  onClose?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isNew = line == null;

  const [label, setLabel] = useState(line?.label ?? "");
  const [kind, setKind] = useState<FeeLineKind>(line?.kind ?? "once");
  const [amount, setAmount] = useState(amountToInput(line?.amount ?? null));
  const [amountExtended, setAmountExtended] = useState(amountToInput(line?.amount_extended ?? null));
  const [months, setMonths] = useState<number[]>(line?.months ?? []);
  const [dueDate, setDueDate] = useState(line?.due_date ?? "");
  const [error, setError] = useState<string | null>(null);

  const idBase = `fee-${audience}-${line?.id ?? "new"}`;
  const showExtended = kind === "monthly" && audience === "base";

  function toggleMonth(month: number) {
    setMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month],
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveFeeLineAction({
        id: line?.id,
        season,
        audience,
        code: line?.code ?? slugifyCode(label, takenCodes),
        label,
        kind,
        amount: amount.trim() === "" ? null : amount.replace(",", "."),
        amount_extended:
          showExtended && amountExtended.trim() !== "" ? amountExtended.replace(",", ".") : null,
        months: kind === "monthly" ? months : [],
        due_date: kind === "once" && dueDate.trim() !== "" ? dueDate.trim() : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      appToast.success(isNew ? "Línea añadida" : "Tarifa guardada");
      if (isNew) onClose?.();
      router.refresh();
    });
  }

  function remove() {
    if (!line) return;
    startTransition(async () => {
      const result = await deleteFeeLineAction(line.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      appToast.success("Línea eliminada");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[var(--club-border)] bg-[var(--club-surface)] p-3.5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <FormInput
          label="Nombre"
          name={`${idBase}-label`}
          id={`${idBase}-label`}
          className="min-h-11"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej. Cuota mensual"
        />
        <FormInput
          label={showExtended ? "Importe habitual (€)" : "Importe (€)"}
          name={`${idBase}-amount`}
          id={`${idBase}-amount`}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          className="min-h-11"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Sin fijar"
        />
        {showExtended ? (
          <FormInput
            label="Importe ampliado (€)"
            name={`${idBase}-amount-extended`}
            id={`${idBase}-amount-extended`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="min-h-11"
            value={amountExtended}
            onChange={(e) => setAmountExtended(e.target.value)}
            placeholder="Igual que el habitual"
          />
        ) : null}
        {isNew ? (
          <FormSelect
            label="Tipo"
            name={`${idBase}-kind`}
            id={`${idBase}-kind`}
            value={kind}
            onChange={(e) => setKind(e.target.value as FeeLineKind)}
            options={[
              { value: "once", label: "Pago único" },
              { value: "monthly", label: "Mensualidad" },
            ]}
          />
        ) : null}
      </div>

      {kind === "monthly" ? (
        <div className="flex flex-col gap-1.5">
          <Label>Meses que se cobran</Label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Meses que se cobran">
            {SEASON_MONTH_ORDER.map((month) => {
              const active = months.includes(month);
              return (
                <button
                  key={month}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMonth(month)}
                  className={cn(
                    "min-h-9 min-w-12 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "border-[var(--club-brand)] bg-[var(--club-brand-soft)] text-[var(--club-brand-strong)]"
                      : "border-[var(--club-border)] text-muted-foreground hover:text-foreground",
                  )}
                >
                  {monthShort(month)}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <FormDate
            label="Fecha límite"
            name={`${idBase}-due-date`}
            id={`${idBase}-due-date`}
            className="min-h-11"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Hasta esta fecha no cuenta como atrasado. Si la dejas vacía, se trata como ya vencido.
          </p>
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="min-h-10"
            onClick={save}
            disabled={pending || label.trim() === ""}
          >
            {isNew ? "Añadir línea" : "Guardar"}
          </Button>
          {isNew ? (
            <Button type="button" variant="secondary" className="min-h-10" onClick={onClose}>
              Cancelar
            </Button>
          ) : null}
        </div>
        {!isNew ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-10 text-destructive"
            onClick={remove}
            disabled={pending}
            aria-label={`Eliminar ${line?.label}`}
          >
            <Trash2 className="size-4" aria-hidden />
            Eliminar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
