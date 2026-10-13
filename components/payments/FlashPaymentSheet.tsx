"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { MethodIcon } from "@/components/payments/MethodMark";
import { registerPaymentAction } from "@/lib/actions/payments/register";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payments/constants";
import { obligationConcept, sortOpenObligations, type FeeObligation } from "@/lib/payments/fees";
import type { PlayerFeeRow } from "@/lib/payments/player-fee-rows";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const OTHER = "__other__";
const MAX_RESULTS = 6;

function formatEuros(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(".", ",")} €`;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Cobro "flash": buscar jugador → qué paga → T/E. Pensado para algo puntual, sin
 * recorrer la matriz. Se queda abierto tras anotar para encadenar varios.
 */
export function FlashPaymentSheet({
  open,
  onClose,
  rows,
  sessionDate,
}: {
  open: boolean;
  onClose: () => void;
  rows: PlayerFeeRow[];
  sessionDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(OTHER);
  const [customConcept, setCustomConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [lastMethod, setLastMethod] = useState<PaymentMethod>("transferencia");
  const [error, setError] = useState<string | null>(null);

  const player = playerId ? (rows.find((r) => r.id === playerId) ?? null) : null;
  const options = useMemo(() => (player ? sortOpenObligations(player.obligations) : []), [player]);
  const selectedObligation = options.find((o) => o.key === selectedKey) ?? null;

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    return rows
      .filter((row) => normalize(`${row.full_name} ${row.team_name ?? ""}`).includes(q))
      .slice(0, MAX_RESULTS);
  }, [rows, query]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, playerId]);

  function reset() {
    setQuery("");
    setHighlight(0);
    setPlayerId(null);
    setSelectedKey(OTHER);
    setCustomConcept("");
    setAmount("");
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  function choosePlayer(row: PlayerFeeRow) {
    const first = sortOpenObligations(row.obligations)[0] ?? null;
    setPlayerId(row.id);
    setSelectedKey(first?.key ?? OTHER);
    setAmount(first ? String(first.remaining) : "");
    setCustomConcept("");
    setError(null);
    requestAnimationFrame(() => amountRef.current?.select());
  }

  function chooseOption(key: string, obligation: FeeObligation | null) {
    setSelectedKey(key);
    setAmount(obligation ? String(obligation.remaining) : "");
    setError(null);
    requestAnimationFrame(() => amountRef.current?.focus());
  }

  function submit(method: PaymentMethod) {
    if (!player || pending) return;
    const amountNumber = Number(amount.replace(",", "."));
    const concept = selectedObligation
      ? obligationConcept(selectedObligation)
      : customConcept.trim();
    if (!concept) {
      setError("Indica el concepto");
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Indica el importe");
      return;
    }

    setLastMethod(method);
    startTransition(async () => {
      const result = await registerPaymentAction({
        player_id: player.id,
        concept,
        amount: amountNumber,
        paid_date: sessionDate,
        method,
        fee_code: selectedObligation?.code ?? null,
        billing_month: selectedObligation?.month ?? null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      appToast.success(
        `${formatEuros(amountNumber)} · ${PAYMENT_METHOD_LABELS[method].toLowerCase()} — ${player.full_name}`,
      );
      reset();
      router.refresh();
    });
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choosePlayer(results[Math.min(highlight, results.length - 1)]);
    }
  }

  const amountNumber = Number(amount.replace(",", "."));
  const amountValid = Number.isFinite(amountNumber) && amountNumber > 0;

  return (
    <ClothingBottomSheet
      open={open}
      onClose={close}
      title="Cobro rápido"
      description="Para un cobro puntual: busca al jugador, elige qué paga y pulsa T o E."
      secondaryAction={{ label: "Cerrar", onClick: close }}
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <div
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {!player ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="flash-search" className="text-sm font-medium text-foreground">
              Jugador
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="flash-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder="Nombre o equipo…"
                autoComplete="off"
                className="min-h-12 w-full rounded-lg border border-[var(--club-border)] bg-[var(--club-surface)] pl-9 pr-3 text-base"
              />
            </div>

            {query.trim() && results.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">Ningún jugador coincide.</p>
            ) : null}

            <ul className="flex flex-col gap-1.5" role="listbox" aria-label="Resultados">
              {results.map((row, index) => {
                const owed = row.obligations.filter((o) => o.overdue && o.remaining > 0).length;
                return (
                  <li key={row.id} role="option" aria-selected={index === highlight}>
                    <button
                      type="button"
                      onClick={() => choosePlayer(row)}
                      onMouseEnter={() => setHighlight(index)}
                      className={cn(
                        "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-3 text-left",
                        index === highlight
                          ? "border-[var(--club-brand)] bg-[var(--club-brand-soft)]"
                          : "border-[var(--club-border)] bg-[var(--club-surface)]",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {row.full_name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {row.team_name ?? "Sin equipo"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {owed > 0 ? `${owed} pendiente${owed === 1 ? "" : "s"}` : "Al día"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">
                  {player.full_name}
                </p>
                <p className="text-xs text-muted-foreground">{player.team_name ?? "Sin equipo"}</p>
              </div>
              <button
                type="button"
                className="min-h-10 shrink-0 rounded-lg px-2 text-sm font-medium text-brand hover:underline"
                onClick={reset}
              >
                Cambiar
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">Qué paga</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Qué paga">
                {options.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={selectedKey === o.key}
                    onClick={() => chooseOption(o.key, o)}
                    className={cn(
                      "min-h-11 rounded-lg border px-3 text-sm font-medium",
                      selectedKey === o.key
                        ? "border-[var(--club-brand)] bg-[var(--club-brand-soft)] text-foreground"
                        : "border-[var(--club-border)] bg-[var(--club-surface)] text-muted-foreground",
                    )}
                  >
                    {obligationConcept(o)}
                    <span className="ml-1.5 tabular-nums opacity-70">
                      {formatEuros(o.remaining)}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedKey === OTHER}
                  onClick={() => chooseOption(OTHER, null)}
                  className={cn(
                    "min-h-11 rounded-lg border px-3 text-sm font-medium",
                    selectedKey === OTHER
                      ? "border-[var(--club-brand)] bg-[var(--club-brand-soft)] text-foreground"
                      : "border-[var(--club-border)] bg-[var(--club-surface)] text-muted-foreground",
                  )}
                >
                  Otro
                </button>
              </div>
            </div>

            {selectedKey === OTHER ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Concepto</span>
                <input
                  type="text"
                  value={customConcept}
                  onChange={(e) => setCustomConcept(e.target.value)}
                  placeholder="Ej. Material de temporada"
                  className="min-h-11 rounded-lg border border-[var(--club-border)] bg-[var(--club-surface)] px-3 text-base"
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Importe (€)</span>
              <input
                ref={amountRef}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit(lastMethod);
                }}
                className="min-h-12 rounded-lg border border-[var(--club-border)] bg-[var(--club-surface)] px-3 text-lg font-semibold tabular-nums"
              />
              {selectedObligation && amountValid && amountNumber < selectedObligation.remaining ? (
                <span className="text-xs text-muted-foreground">
                  {`Quedará pendiente ${formatEuros(selectedObligation.remaining - amountNumber)}`}
                </span>
              ) : null}
            </label>

            <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Método de cobro">
              {(["transferencia", "efectivo"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  disabled={pending || !amountValid}
                  onClick={() => submit(method)}
                  className={cn(
                    "flex min-h-14 items-center justify-center gap-2 rounded-lg border text-sm font-semibold disabled:opacity-50",
                    method === lastMethod
                      ? "border-[var(--club-brand)] bg-[var(--club-brand-soft)]"
                      : "border-[var(--club-border)] bg-[var(--club-surface)]",
                  )}
                >
                  <MethodIcon method={method} className="size-5" />
                  <span className="text-lg font-extrabold">
                    {method === "transferencia" ? "T" : "E"}
                  </span>
                  {PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ClothingBottomSheet>
  );
}
