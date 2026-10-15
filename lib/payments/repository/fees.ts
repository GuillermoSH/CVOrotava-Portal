import "server-only";

import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import type { PaymentsDb } from "@/lib/payments/repository/client";
import type { FeeAudience, FeeLineKind, SeasonFeeLine } from "@/lib/types/db";

const FEE_LINE_SELECT =
  "id, season, audience, code, label, kind, amount, amount_extended, months, due_date, sort_order";

type SeasonFeeLineRow = {
  id: string;
  season: string;
  audience: string;
  code: string;
  label: string;
  kind: string;
  amount: number | string | null;
  amount_extended: number | string | null;
  months: number[] | null;
  due_date: string | null;
  sort_order: number;
};

function toNumber(value: number | string | null): number | null {
  if (value == null) return null;
  return typeof value === "string" ? Number(value) : value;
}

function mapFeeLine(row: SeasonFeeLineRow): SeasonFeeLine {
  return {
    id: row.id,
    season: row.season,
    audience: row.audience as FeeAudience,
    code: row.code,
    label: row.label,
    kind: row.kind as FeeLineKind,
    amount: toNumber(row.amount),
    amount_extended: toNumber(row.amount_extended),
    months: row.months ?? [],
    due_date: row.due_date ?? null,
    sort_order: row.sort_order,
  };
}

/** Tarifa completa de una temporada, ordenada por audiencia y orden de línea. */
export async function listSeasonFeeLines(
  db: PaymentsDb,
  season: string,
): Promise<SeasonFeeLine[]> {
  const { data, error } = await db
    .from("season_fee_lines")
    .select(FEE_LINE_SELECT)
    .eq("season", season)
    .order("sort_order");

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map((row) => mapFeeLine(row as SeasonFeeLineRow));
}

export type UpsertFeeLineRecord = {
  id?: string;
  season: string;
  audience: FeeAudience;
  code: string;
  label: string;
  kind: FeeLineKind;
  amount: number | null;
  amount_extended: number | null;
  months: number[];
  due_date: string | null;
};

/** Máximo sort_order de la audiencia: la línea nueva queda al final de su bloque. */
async function nextFeeLineSortOrder(
  db: PaymentsDb,
  season: string,
  audience: FeeAudience,
): Promise<number> {
  const { data, error } = await db
    .from("season_fee_lines")
    .select("sort_order")
    .eq("season", season)
    .eq("audience", audience)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(dbErrorMessage(error));
  return (data?.sort_order ?? 0) + 1;
}

export async function upsertFeeLine(
  db: PaymentsDb,
  input: UpsertFeeLineRecord,
): Promise<SeasonFeeLine> {
  const values = {
    season: input.season,
    audience: input.audience,
    code: input.code,
    label: input.label,
    kind: input.kind,
    amount: input.amount,
    amount_extended: input.kind === "monthly" ? input.amount_extended : null,
    months: input.kind === "monthly" ? input.months : [],
    due_date: input.kind === "once" ? input.due_date : null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await db
      .from("season_fee_lines")
      .update(values)
      .eq("id", input.id)
      .select(FEE_LINE_SELECT)
      .single();
    if (error) throw new Error(dbErrorMessage(error));
    return mapFeeLine(data as SeasonFeeLineRow);
  }

  const sortOrder = await nextFeeLineSortOrder(db, input.season, input.audience);
  const { data, error } = await db
    .from("season_fee_lines")
    .insert({ ...values, sort_order: sortOrder })
    .select(FEE_LINE_SELECT)
    .single();
  if (error) throw new Error(dbErrorMessage(error));
  return mapFeeLine(data as SeasonFeeLineRow);
}

export async function deleteFeeLine(db: PaymentsDb, id: string): Promise<void> {
  const { error } = await db.from("season_fee_lines").delete().eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}

/** Copia la tarifa de una temporada a otra vacía; devuelve cuántas líneas creó. */
export async function copySeasonFeeLines(
  db: PaymentsDb,
  fromSeason: string,
  toSeason: string,
): Promise<number> {
  const existing = await listSeasonFeeLines(db, toSeason);
  if (existing.length > 0) {
    throw new Error("La temporada de destino ya tiene tarifa");
  }

  const source = await listSeasonFeeLines(db, fromSeason);
  if (source.length === 0) return 0;

  const { error } = await db.from("season_fee_lines").insert(
    source.map((line) => ({
      season: toSeason,
      audience: line.audience,
      code: line.code,
      label: line.label,
      kind: line.kind,
      amount: line.amount,
      amount_extended: line.amount_extended,
      months: line.months,
      due_date: line.due_date,
      sort_order: line.sort_order,
    })),
  );
  if (error) throw new Error(dbErrorMessage(error));
  return source.length;
}
