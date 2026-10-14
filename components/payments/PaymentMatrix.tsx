"use client";

import { useRouter } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { deletePaymentAction, updatePaymentMethodAction } from "@/lib/actions/payments/correct";
import { MethodIcon, MethodLetters } from "@/components/payments/MethodMark";
import { registerPaymentAction } from "@/lib/actions/payments/register";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payments/constants";
import {
  buildRowCells,
  columnsProgress,
  formatShortDate,
  lastPaymentDate,
  matrixCell,
  methodLetters,
  rowCellsSignature,
  type MatrixCell,
  type MatrixColumn,
} from "@/lib/payments/matrix";
import { monthName, monthShort, obligationConcept } from "@/lib/payments/fees";
import type { PlayerFeeRow } from "@/lib/payments/player-fee-rows";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function formatEuros(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(".", ",");
}

function columnHeader(column: MatrixColumn, showLabel: boolean) {
  if (column.kind === "once") {
    return { main: column.label, sub: null as string | null };
  }
  return {
    main: monthShort(column.month ?? 0),
    sub: showLabel ? column.label : null,
  };
}

function cellAriaLabel(row: PlayerFeeRow, column: MatrixColumn, cell: MatrixCell): string {
  const what =
    column.kind === "once" ? column.label : `${column.label} ${monthName(column.month ?? 0)}`;
  switch (cell.kind) {
    case "paid":
      return `${row.full_name}, ${what}: pagado ${methodLetters(cell.payments) || ""}`.trim();
    case "partial":
      return `${row.full_name}, ${what}: parcial, faltan ${formatEuros(cell.obligation?.remaining ?? 0)} €`;
    case "due":
      return `${row.full_name}, ${what}: vencido, ${formatEuros(cell.obligation?.remaining ?? 0)} €`;
    case "upcoming":
      return `${row.full_name}, ${what}: por llegar, ${formatEuros(cell.obligation?.remaining ?? 0)} €`;
    default:
      return `${row.full_name}, ${what}: no aplica`;
  }
}

type ActiveCell = { rowId: string; columnKey: string; anchor: DOMRect };

type OptimisticMark = { letter: string; date: string };

/** rowId → columnKey → marca pintada mientras el servidor confirma. */
type OptimisticCells = ReadonlyMap<string, ReadonlyMap<string, OptimisticMark>>;

type Optimistic = {
  rows: readonly PlayerFeeRow[];
  cells: OptimisticCells;
};

const POPOVER_WIDTH = 272;

function CellPopover({
  row,
  column,
  cell,
  anchor,
  sessionDate,
  lastMethod,
  busy,
  onClose,
  onRegister,
  onChangeMethod,
  onAnnul,
  onOther,
}: {
  row: PlayerFeeRow;
  column: MatrixColumn;
  cell: MatrixCell;
  anchor: DOMRect;
  sessionDate: string;
  lastMethod: PaymentMethod;
  busy: boolean;
  onClose: () => void;
  onRegister: (amount: number, method: PaymentMethod) => void;
  onChangeMethod: (paymentId: string, method: PaymentMethod) => void;
  onAnnul: (paymentId: string) => void;
  onOther: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const remaining = cell.obligation?.remaining ?? 0;
  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : "");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const margin = 8;
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - margin * 2);
    const height = el.offsetHeight;
    let left = anchor.left + anchor.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    let top = anchor.bottom + 6;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - height - 6);
    }
    setPosition({ top, left });
  }, [anchor, cell.kind, cell.payments.length]);

  useEffect(() => {
    amountRef.current?.focus();
    amountRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointer(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const amountNumber = Number(amount.replace(",", "."));
  const amountValid = Number.isFinite(amountNumber) && amountNumber > 0;
  const what =
    column.kind === "once" ? column.label : `${column.label} · ${monthName(column.month ?? 0)}`;

  function submit(method: PaymentMethod) {
    if (!amountValid || busy) return;
    onRegister(amountNumber, method);
  }

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`${what} — ${row.full_name}`}
      className="pay-popover"
      style={{
        top: position?.top ?? anchor.bottom + 6,
        left: position?.left ?? anchor.left,
        width: Math.min(POPOVER_WIDTH, window.innerWidth - 16),
        visibility: position ? "visible" : "hidden",
      }}
    >
      <div className="pay-popover__head">
        <p className="pay-popover__title">{what}</p>
        <p className="pay-popover__sub">{row.full_name}</p>
      </div>

      {cell.payments.length > 0 ? (
        <ul className="pay-popover__payments" aria-label="Cobros anotados">
          {cell.payments.map((payment) => {
            const method = payment.method as PaymentMethod | null;
            const other: PaymentMethod = method === "efectivo" ? "transferencia" : "efectivo";
            return (
              <li key={payment.id} className="pay-popover__payment">
                <span className="pay-popover__payment-info">
                  <span className="ropa-digit">{formatEuros(payment.amount)} €</span>
                  <span className="text-muted-foreground">
                    {method ? PAYMENT_METHOD_LABELS[method] : "Sin método"}
                  </span>
                </span>
                <span className="pay-popover__payment-actions">
                  <button
                    type="button"
                    className="pay-popover__link"
                    disabled={busy}
                    onClick={() => onChangeMethod(payment.id, other)}
                  >
                    Pasar a {other === "efectivo" ? "E" : "T"}
                  </button>
                  <button
                    type="button"
                    className="pay-popover__link pay-popover__link--danger"
                    disabled={busy}
                    onClick={() => onAnnul(payment.id)}
                  >
                    Anular
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {remaining > 0 ? (
        <div className="pay-popover__body">
          <label className="pay-popover__field">
            <span className="pay-popover__label">
              {cell.kind === "partial" ? "Resto (€)" : "Importe (€)"}
            </span>
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
              className="pay-popover__input"
              aria-label="Importe en euros"
            />
          </label>
          <div className="pay-popover__methods" role="group" aria-label="Método de cobro">
            {(["transferencia", "efectivo"] as const).map((method) => (
              <button
                key={method}
                type="button"
                disabled={!amountValid || busy}
                onClick={() => submit(method)}
                className={cn(
                  "pay-popover__method",
                  method === lastMethod && "pay-popover__method--last",
                )}
              >
                <span className="pay-popover__method-top">
                  <MethodIcon method={method} className="size-[1.125rem]" />
                  <span className="pay-popover__method-letter">
                    {method === "transferencia" ? "T" : "E"}
                  </span>
                </span>
                <span className="pay-popover__method-name">{PAYMENT_METHOD_LABELS[method]}</span>
              </button>
            ))}
          </div>
          <p className="pay-popover__hint">
            {amountValid && amountNumber < remaining
              ? `Quedará pendiente ${formatEuros(remaining - amountNumber)} €`
              : amountValid && amountNumber > remaining
                ? `${formatEuros(amountNumber - remaining)} € más de lo pendiente: se anota tal cual`
                : `Fecha de cobro: ${sessionDate.split("-").reverse().join("/")}`}
          </p>
        </div>
      ) : null}

      <div className="pay-popover__foot">
        <button type="button" className="pay-popover__link" onClick={onOther}>
          Otro cobro…
        </button>
        <button type="button" className="pay-popover__link" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>,
    document.body,
  );
}

type MatrixRowProps = {
  row: PlayerFeeRow;
  rowIndex: number;
  columns: MatrixColumn[];
  cells: MatrixCell[];
  /** Firma de columnas + celdas: sin cambios de contenido, la fila no se vuelve a pintar. */
  signature: string;
  selected: boolean;
  optimistic: ReadonlyMap<string, OptimisticMark> | undefined;
  activeColumnKey: string | null;
  onToggleSelect: (id: string) => void;
  onOpenCell: (row: PlayerFeeRow, column: MatrixColumn, element: HTMLElement) => void;
  onOther: (row: PlayerFeeRow) => void;
};

const MatrixRow = memo(
  function MatrixRow({
    row,
    rowIndex,
    columns,
    cells,
    selected,
    optimistic,
    activeColumnKey,
    onToggleSelect,
    onOpenCell,
    onOther,
  }: MatrixRowProps) {
    return (
      <tr className={selected ? "is-selected" : undefined}>
        <th scope="row" className="pay-matrix__player">
          <input
            type="checkbox"
            className="size-4 shrink-0 rounded border-[var(--club-border)] accent-brand"
            checked={selected}
            onChange={() => onToggleSelect(row.id)}
            aria-label={`Seleccionar ${row.full_name}`}
          />
          <span className="pay-matrix__player-text">
            <span className="pay-matrix__name">{row.full_name}</span>
            <span className="pay-matrix__team">{row.team_name ?? "Sin equipo"}</span>
          </span>
        </th>
        {columns.map((column, c) => {
          const cell = cells[c];
          if (cell.kind === "none") {
            return (
              <td key={column.key} className="pay-matrix__cell">
                <span
                  className="pay-cell pay-cell--none"
                  aria-label={cellAriaLabel(row, column, cell)}
                >
                  –
                </span>
              </td>
            );
          }

          const pendingMark = optimistic?.get(column.key);
          const pendingLetter = pendingMark?.letter;
          const kind = pendingLetter ? "paid" : cell.kind;
          let content: ReactNode;
          if (pendingMark) {
            content = (
              <span className="pay-cell__stack">
                <MethodLetters letters={pendingMark.letter} />
                <span className="pay-cell__date">{formatShortDate(pendingMark.date)}</span>
              </span>
            );
          } else if (cell.kind === "paid") {
            const letters = methodLetters(cell.payments);
            const date = formatShortDate(lastPaymentDate(cell.payments));
            content = letters ? (
              <span className="pay-cell__stack">
                <MethodLetters letters={letters} />
                {date ? <span className="pay-cell__date">{date}</span> : null}
              </span>
            ) : (
              "✓"
            );
          }
          else if (cell.kind === "partial") content = formatEuros(cell.obligation?.paid ?? 0);
          else if (cell.kind === "due") content = formatEuros(cell.obligation?.remaining ?? 0);
          else content = "·";

          return (
            <td key={column.key} className="pay-matrix__cell">
              <button
                type="button"
                data-cell={`${rowIndex},${c}`}
                className={cn(
                  "pay-cell",
                  `pay-cell--${kind}`,
                  pendingLetter && "is-saving",
                  activeColumnKey === column.key && "is-active",
                )}
                aria-label={cellAriaLabel(row, column, cell)}
                aria-haspopup="dialog"
                onClick={(e) => onOpenCell(row, column, e.currentTarget)}
              >
                {content}
                {cell.kind === "partial" && !pendingLetter ? (
                  <span className="pay-cell__rest">/{formatEuros(cell.obligation?.due ?? 0)}</span>
                ) : null}
              </button>
            </td>
          );
        })}
        <td className="pay-matrix__cell pay-matrix__cell--other">
          <button
            type="button"
            className="pay-matrix__other"
            onClick={() => onOther(row)}
            aria-label={`Otro cobro para ${row.full_name}`}
          >
            Otro
          </button>
        </td>
      </tr>
    );
  },
  (prev, next) =>
    prev.signature === next.signature &&
    prev.row.id === next.row.id &&
    prev.rowIndex === next.rowIndex &&
    prev.selected === next.selected &&
    prev.optimistic === next.optimistic &&
    prev.activeColumnKey === next.activeColumnKey &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onOpenCell === next.onOpenCell &&
    prev.onOther === next.onOther,
);

export function PaymentMatrix({
  rows,
  columns,
  selected,
  allSelected,
  someSelected,
  onToggleSelect,
  onToggleAll,
  sessionDate,
  onOther,
  selectAllRef,
}: {
  rows: PlayerFeeRow[];
  columns: MatrixColumn[];
  selected: ReadonlySet<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  sessionDate: string;
  onOther: (row: PlayerFeeRow) => void;
  selectAllRef: RefObject<HTMLInputElement | null>;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const tableRef = useRef<HTMLTableElement>(null);
  const [active, setActive] = useState<ActiveCell | null>(null);
  const [lastMethod, setLastMethod] = useState<PaymentMethod>("transferencia");
  const [optimistic, setOptimistic] = useState<Optimistic | null>(null);

  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const columnByKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);
  const showMonthlyLabels = useMemo(
    () => new Set(columns.filter((c) => c.kind === "monthly").map((c) => c.code)).size > 1,
    [columns],
  );

  /** Celdas y firma de cada fila, calculadas una vez por cambio de datos (no por render). */
  const computed = useMemo(() => {
    const columnsSignature = columns.map((c) => c.key).join(",");
    const cellsByRow = rows.map((row) => buildRowCells(row, columns));
    return {
      cellsByRow,
      signatures: cellsByRow.map((cells) => `${columnsSignature}#${rowCellsSignature(cells)}`),
      progress: columnsProgress(cellsByRow, columns.length),
    };
  }, [rows, columns]);

  /** El overlay optimista solo vale mientras no llegue un `rows` nuevo del servidor. */
  const overlay: OptimisticCells | null =
    optimistic && optimistic.rows === rows ? optimistic.cells : null;

  const activeRow = active ? (rowById.get(active.rowId) ?? null) : null;
  const activeColumn = active ? (columnByKey.get(active.columnKey) ?? null) : null;
  const activeCell = activeRow && activeColumn ? matrixCell(activeRow, activeColumn) : null;

  const openCell = useCallback(
    (row: PlayerFeeRow, column: MatrixColumn, element: HTMLElement) => {
      setActive({ rowId: row.id, columnKey: column.key, anchor: element.getBoundingClientRect() });
    },
    [],
  );

  function mark(rowId: string, columnKey: string, value: OptimisticMark | null) {
    setOptimistic((prev) => {
      const next = new Map<string, Map<string, OptimisticMark>>();
      if (prev && prev.rows === rows) {
        for (const [id, cols] of prev.cells) next.set(id, new Map(cols));
      }
      const cols = next.get(rowId) ?? new Map<string, OptimisticMark>();
      if (value) cols.set(columnKey, value);
      else cols.delete(columnKey);
      if (cols.size > 0) next.set(rowId, cols);
      else next.delete(rowId);
      return { rows, cells: next };
    });
  }

  function register(amount: number, method: PaymentMethod) {
    if (!activeRow || !activeColumn || !activeCell?.obligation) return;
    const row = activeRow;
    const column = activeColumn;
    const obligation = activeCell.obligation;
    setLastMethod(method);
    setActive(null);
    mark(row.id, column.key, {
      letter: method === "transferencia" ? "T" : "E",
      date: sessionDate,
    });

    startTransition(async () => {
      const result = await registerPaymentAction({
        player_id: row.id,
        concept: obligationConcept(obligation),
        amount,
        paid_date: sessionDate,
        method,
        fee_code: obligation.code,
        billing_month: obligation.month,
      });
      if (!result.ok) {
        mark(row.id, column.key, null);
        appToast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function changeMethod(paymentId: string, method: PaymentMethod) {
    startTransition(async () => {
      const result = await updatePaymentMethodAction({ id: paymentId, method });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      setActive(null);
      appToast.success(`Cobro pasado a ${PAYMENT_METHOD_LABELS[method].toLowerCase()}`);
      router.refresh();
    });
  }

  function annul(paymentId: string) {
    startTransition(async () => {
      const result = await deletePaymentAction({ id: paymentId });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      setActive(null);
      appToast.success("Cobro anulado");
      router.refresh();
    });
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const target = event.target as HTMLElement;
    const position = target.dataset.cell;
    if (!position) return;
    const [r, c] = position.split(",").map(Number);
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    const next = tableRef.current?.querySelector<HTMLElement>(
      `[data-cell="${r + move[0]},${c + move[1]}"]:not([disabled])`,
    );
    next?.focus();
  }

  return (
    <>
      <div className="pay-matrix-wrap">
        <table
          ref={tableRef}
          className="pay-matrix"
          onKeyDown={onGridKeyDown}
          aria-label="Matriz de cobros por jugador y mes"
        >
          <thead>
            <tr>
              <th scope="col" className="pay-matrix__player pay-matrix__corner">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="size-4 rounded border-[var(--club-border)] accent-brand"
                  checked={allSelected}
                  aria-checked={someSelected ? "mixed" : allSelected}
                  onChange={onToggleAll}
                  aria-label="Seleccionar todos los visibles"
                />
                <span>Jugador</span>
              </th>
              {columns.map((column) => {
                const header = columnHeader(column, showMonthlyLabels);
                return (
                  <th key={column.key} scope="col" className="pay-matrix__col">
                    <span className="pay-matrix__col-main">{header.main}</span>
                    {header.sub ? <span className="pay-matrix__col-sub">{header.sub}</span> : null}
                  </th>
                );
              })}
              <th scope="col" className="pay-matrix__col pay-matrix__col--other">
                <span className="sr-only">Otro cobro</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <MatrixRow
                key={row.id}
                row={row}
                rowIndex={r}
                columns={columns}
                cells={computed.cellsByRow[r]}
                signature={computed.signatures[r]}
                selected={selected.has(row.id)}
                optimistic={overlay?.get(row.id)}
                activeColumnKey={active?.rowId === row.id ? active.columnKey : null}
                onToggleSelect={onToggleSelect}
                onOpenCell={openCell}
                onOther={onOther}
              />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="pay-matrix__player pay-matrix__foot-label">
                Cobrado
              </th>
              {columns.map((column, i) => (
                <td key={column.key} className="pay-matrix__foot">
                  <span className="ropa-digit">{computed.progress[i].paid}</span>
                  <span className="pay-matrix__foot-total">/{computed.progress[i].total}</span>
                </td>
              ))}
              <td className="pay-matrix__foot" />
            </tr>
          </tfoot>
        </table>
      </div>

      {active && activeRow && activeColumn && activeCell && activeCell.kind !== "none" ? (
        <CellPopover
          key={`${active.rowId}|${active.columnKey}`}
          row={activeRow}
          column={activeColumn}
          cell={activeCell}
          anchor={active.anchor}
          sessionDate={sessionDate}
          lastMethod={lastMethod}
          busy={busy}
          onClose={() => setActive(null)}
          onRegister={register}
          onChangeMethod={changeMethod}
          onAnnul={annul}
          onOther={() => {
            setActive(null);
            onOther(activeRow);
          }}
        />
      ) : null}
    </>
  );
}
