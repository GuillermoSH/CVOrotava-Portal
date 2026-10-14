import { describe, expect, it } from "vitest";

import type { FeeObligation } from "@/lib/payments/fees";
import {
  buildMatrixColumns,
  buildRowCells,
  columnsProgress,
  matrixCell,
  methodLetters,
  rowCellsSignature,
} from "@/lib/payments/matrix";
import type { PlayerFeeRow, PlayerPaymentFact } from "@/lib/payments/player-fee-rows";

function obligation(partial: Partial<FeeObligation> & Pick<FeeObligation, "code">): FeeObligation {
  const month = partial.month ?? null;
  return {
    key: month == null ? partial.code : `${partial.code}:${month}`,
    label: partial.code,
    kind: month == null ? "once" : "monthly",
    due: 25,
    paid: 0,
    remaining: 25,
    overdue: true,
    ...partial,
    month,
  };
}

function payment(partial: Partial<PlayerPaymentFact>): PlayerPaymentFact {
  return {
    id: "p",
    amount: 25,
    status: "paid",
    method: "transferencia",
    paid_date: "2026-10-13",
    fee_code: null,
    billing_month: null,
    ...partial,
  };
}

function row(
  id: string,
  obligations: FeeObligation[],
  payments: PlayerPaymentFact[] = [],
): PlayerFeeRow {
  return {
    id,
    full_name: id,
    team_name: null,
    audience: "base",
    obligations,
    payments,
    unassigned: { count: 0, total: 0 },
  };
}

describe("buildMatrixColumns", () => {
  it("puts one-off concepts first and orders months by season", () => {
    const columns = buildMatrixColumns([
      row("a", [
        obligation({ code: "matricula" }),
        obligation({ code: "mensualidad", month: 1 }),
        obligation({ code: "mensualidad", month: 10 }),
        obligation({ code: "mensualidad", month: 12 }),
      ]),
    ]);
    expect(columns.map((c) => c.key)).toEqual([
      "matricula",
      "mensualidad:10",
      "mensualidad:12",
      "mensualidad:1",
    ]);
  });

  it("merges columns that apply to different audiences", () => {
    const columns = buildMatrixColumns([
      row("base", [obligation({ code: "matricula" }), obligation({ code: "mensualidad", month: 10 })]),
      row("senior", [
        obligation({ code: "matricula" }),
        obligation({ code: "pago_unico" }),
        obligation({ code: "mensualidad", month: 1 }),
      ]),
    ]);
    expect(columns.map((c) => c.key)).toEqual([
      "matricula",
      "pago_unico",
      "mensualidad:10",
      "mensualidad:1",
    ]);
  });
});

describe("matrixCell", () => {
  const col = { key: "mensualidad:10", code: "mensualidad", label: "Cuota", kind: "monthly" as const, month: 10 };

  it("is none when the concept does not apply to the player", () => {
    expect(matrixCell(row("a", []), col).kind).toBe("none");
  });

  it("is paid with its payments when fully covered", () => {
    const cell = matrixCell(
      row(
        "a",
        [obligation({ code: "mensualidad", month: 10, paid: 25, remaining: 0 })],
        [payment({ id: "x", fee_code: "mensualidad", billing_month: 10 })],
      ),
      col,
    );
    expect(cell.kind).toBe("paid");
    expect(cell.payments.map((p) => p.id)).toEqual(["x"]);
  });

  it("is partial when something was paid but not all", () => {
    const cell = matrixCell(
      row("a", [obligation({ code: "mensualidad", month: 10, paid: 10, remaining: 15 })]),
      col,
    );
    expect(cell.kind).toBe("partial");
  });

  it("is due when overdue and unpaid, upcoming otherwise", () => {
    expect(
      matrixCell(row("a", [obligation({ code: "mensualidad", month: 10 })]), col).kind,
    ).toBe("due");
    expect(
      matrixCell(
        row("a", [obligation({ code: "mensualidad", month: 10, overdue: false })]),
        col,
      ).kind,
    ).toBe("upcoming");
  });

  it("only attaches payments of the same month", () => {
    const cell = matrixCell(
      row(
        "a",
        [obligation({ code: "mensualidad", month: 10 })],
        [
          payment({ id: "oct", fee_code: "mensualidad", billing_month: 10 }),
          payment({ id: "nov", fee_code: "mensualidad", billing_month: 11 }),
        ],
      ),
      col,
    );
    expect(cell.payments.map((p) => p.id)).toEqual(["oct"]);
  });
});

describe("methodLetters", () => {
  it("shows T, E or both", () => {
    expect(methodLetters([payment({ method: "transferencia" })])).toBe("T");
    expect(methodLetters([payment({ method: "efectivo" })])).toBe("E");
    expect(
      methodLetters([payment({ method: "efectivo" }), payment({ method: "transferencia" })]),
    ).toBe("T+E");
    expect(methodLetters([])).toBe("");
  });
});

describe("buildRowCells", () => {
  const columns = [
    { key: "matricula", code: "matricula", label: "Matrícula", kind: "once" as const, month: null },
    { key: "mensualidad:10", code: "mensualidad", label: "Cuota", kind: "monthly" as const, month: 10 },
    { key: "mensualidad:11", code: "mensualidad", label: "Cuota", kind: "monthly" as const, month: 11 },
  ];

  it("aligns one cell per column with the right payments", () => {
    const cells = buildRowCells(
      row(
        "a",
        [
          obligation({ code: "matricula", paid: 75, remaining: 0 }),
          obligation({ code: "mensualidad", month: 10, paid: 25, remaining: 0 }),
        ],
        [
          payment({ id: "m", fee_code: "matricula" }),
          payment({ id: "oct", fee_code: "mensualidad", billing_month: 10 }),
          payment({ id: "legacy", fee_code: "mensualidad", billing_month: null }),
        ],
      ),
      columns,
    );
    expect(cells.map((c) => c.kind)).toEqual(["paid", "paid", "none"]);
    expect(cells[0].payments.map((p) => p.id)).toEqual(["m"]);
    expect(cells[1].payments.map((p) => p.id)).toEqual(["oct"]);
  });

  it("produces a stable signature that changes when a cell changes", () => {
    const open = buildRowCells(
      row("a", [obligation({ code: "matricula" })]),
      columns.slice(0, 1),
    );
    const paid = buildRowCells(
      row(
        "a",
        [obligation({ code: "matricula", paid: 75, remaining: 0 })],
        [payment({ fee_code: "matricula", method: "efectivo" })],
      ),
      columns.slice(0, 1),
    );
    expect(rowCellsSignature(open)).toBe(rowCellsSignature(open));
    expect(rowCellsSignature(open)).not.toBe(rowCellsSignature(paid));
  });
});

describe("columnsProgress", () => {
  it("counts covered players over those the concept applies to", () => {
    const col = {
      key: "matricula",
      code: "matricula",
      label: "Matrícula",
      kind: "once" as const,
      month: null,
    };
    const rows = [
      row("a", [obligation({ code: "matricula", paid: 75, remaining: 0 })]),
      row("b", [obligation({ code: "matricula" })]),
      row("c", []),
    ];
    const cells = rows.map((r) => buildRowCells(r, [col]));
    expect(columnsProgress(cells, 1)).toEqual([{ paid: 1, total: 2 }]);
  });
});
