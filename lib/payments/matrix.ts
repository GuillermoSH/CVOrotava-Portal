import { seasonMonthIndex } from "@/lib/payments/fees";
import type { FeeObligation } from "@/lib/payments/fees";
import type { PlayerFeeRow, PlayerPaymentFact } from "@/lib/payments/player-fee-rows";
import type { FeeLineKind } from "@/lib/types/db";

/** Columna de la matriz de cobro: un concepto único o un mes de una mensualidad. */
export type MatrixColumn = {
  key: string;
  code: string;
  label: string;
  kind: FeeLineKind;
  month: number | null;
};

/**
 * Columnas de la matriz: primero los conceptos únicos (matrícula, equipación, pago
 * único…) y luego los meses en orden de temporada. Solo existen las que aplican a
 * algún jugador visible (una línea sin importe no genera columna).
 */
export function buildMatrixColumns(rows: readonly PlayerFeeRow[]): MatrixColumn[] {
  const once = new Map<string, MatrixColumn>();
  const monthly = new Map<string, MatrixColumn>();
  const monthlyCodeOrder: string[] = [];

  for (const row of rows) {
    for (const o of row.obligations) {
      const column: MatrixColumn = {
        key: o.key,
        code: o.code,
        label: o.label,
        kind: o.kind,
        month: o.month,
      };
      if (o.kind === "once") {
        if (!once.has(o.key)) once.set(o.key, column);
      } else if (!monthly.has(o.key)) {
        monthly.set(o.key, column);
        if (!monthlyCodeOrder.includes(o.code)) monthlyCodeOrder.push(o.code);
      }
    }
  }

  const monthlyColumns = [...monthly.values()].sort((a, b) => {
    const byCode = monthlyCodeOrder.indexOf(a.code) - monthlyCodeOrder.indexOf(b.code);
    if (byCode !== 0) return byCode;
    return seasonMonthIndex(a.month ?? 0) - seasonMonthIndex(b.month ?? 0);
  });

  return [...once.values(), ...monthlyColumns];
}

export type MatrixCellKind = "none" | "paid" | "partial" | "due" | "upcoming";

export type MatrixCell = {
  kind: MatrixCellKind;
  obligation: FeeObligation | null;
  payments: PlayerPaymentFact[];
};

function cellFrom(obligation: FeeObligation | null, payments: PlayerPaymentFact[]): MatrixCell {
  if (!obligation) return { kind: "none", obligation: null, payments: [] };

  let kind: MatrixCellKind;
  if (obligation.remaining === 0) kind = "paid";
  else if (obligation.paid > 0) kind = "partial";
  else if (obligation.overdue) kind = "due";
  else kind = "upcoming";

  return { kind, obligation, payments };
}

function paymentSlot(code: string | null, month: number | null): string {
  return `${code ?? ""}|${month ?? ""}`;
}

/**
 * Celdas de una fila alineadas con `columns`, en una sola pasada (O(obligaciones +
 * cobros + columnas)). Los cobros de conceptos únicos se agrupan sin mes; los de
 * mensualidad, por mes.
 */
export function buildRowCells(
  row: PlayerFeeRow,
  columns: readonly MatrixColumn[],
): MatrixCell[] {
  const obligationByKey = new Map<string, FeeObligation>();
  for (const o of row.obligations) obligationByKey.set(o.key, o);

  const paymentsBySlot = new Map<string, PlayerPaymentFact[]>();
  for (const p of row.payments) {
    const slot = paymentSlot(p.fee_code, p.billing_month);
    const list = paymentsBySlot.get(slot);
    if (list) list.push(p);
    else paymentsBySlot.set(slot, [p]);
  }

  return columns.map((column) =>
    cellFrom(
      obligationByKey.get(column.key) ?? null,
      paymentsBySlot.get(paymentSlot(column.code, column.month)) ?? [],
    ),
  );
}

/** Una celda suelta (popover); las filas usan `buildRowCells`. */
export function matrixCell(row: PlayerFeeRow, column: MatrixColumn): MatrixCell {
  const obligation = row.obligations.find((o) => o.key === column.key) ?? null;
  const payments = row.payments.filter(
    (p) =>
      p.fee_code === column.code && (column.month == null || p.billing_month === column.month),
  );
  return cellFrom(obligation, payments);
}

/** Firma de lo que se pinta en una fila: permite saltarse el re-render si no cambió. */
export function rowCellsSignature(cells: readonly MatrixCell[]): string {
  return cells
    .map((cell) =>
      cell.kind === "none"
        ? "-"
        : `${cell.kind}:${cell.obligation?.paid ?? 0}:${cell.obligation?.remaining ?? 0}:${methodLetters(cell.payments)}`,
    )
    .join("|");
}

/** `T`, `E` o `T+E` si el mismo concepto se cobró por las dos vías. */
export function methodLetters(payments: readonly PlayerPaymentFact[]): string {
  const letters = new Set<string>();
  for (const p of payments) {
    if (p.method === "transferencia") letters.add("T");
    else if (p.method === "efectivo") letters.add("E");
  }
  return [...letters].sort().reverse().join("+");
}

/** Cuántos jugadores tienen cada columna cubierta sobre los que les aplica. */
export function columnsProgress(
  cellsByRow: readonly (readonly MatrixCell[])[],
  columnCount: number,
): { paid: number; total: number }[] {
  const progress = Array.from({ length: columnCount }, () => ({ paid: 0, total: 0 }));
  for (const cells of cellsByRow) {
    for (let i = 0; i < columnCount; i += 1) {
      const cell = cells[i];
      if (!cell || cell.kind === "none") continue;
      progress[i].total += 1;
      if (cell.kind === "paid") progress[i].paid += 1;
    }
  }
  return progress;
}
