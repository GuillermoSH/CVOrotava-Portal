import "server-only";

import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import type { PaymentsDb } from "@/lib/payments/repository/client";
import type { PaymentPlayer } from "@/lib/payments/player-fee-rows";
import type { SeasonId } from "@/lib/season";

type PaymentPlayerRow = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  pays_extended_monthly: boolean | null;
  is_active: boolean | null;
  team:
    | { id: string; name: string; category: string }
    | { id: string; name: string; category: string }[]
    | null;
};

/**
 * Jugadores de la temporada con lo mínimo que necesita /admin/pagos: nombre, equipo
 * (categoría → audiencia de tarifa) y cuota ampliada. Sin contactos ni ficha completa:
 * es la consulta que dispara cada refresco de la matriz.
 */
export async function listPlayersForPayments(
  db: PaymentsDb,
  season: SeasonId,
): Promise<PaymentPlayer[]> {
  const { data, error } = await db
    .from("players")
    .select("id, full_name, first_name, last_name, pays_extended_monthly, is_active, team:teams(id, name, category)")
    .eq("season", season)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));

  return ((data ?? []) as PaymentPlayerRow[]).map((row) => {
    const team = Array.isArray(row.team) ? (row.team[0] ?? null) : row.team;
    return {
      id: row.id,
      full_name: row.full_name,
      first_name: row.first_name,
      last_name: row.last_name,
      pays_extended_monthly: Boolean(row.pays_extended_monthly),
      is_active: row.is_active !== false,
      team: team ? { name: team.name, category: team.category } : null,
    };
  });
}
