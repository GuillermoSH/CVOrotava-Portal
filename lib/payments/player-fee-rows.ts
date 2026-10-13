import {
  audienceForCategory,
  computeObligations,
  unassignedPaidPayments,
  type FeeObligation,
  type FeePaymentLike,
} from "@/lib/payments/fees";
import type { SeasonId } from "@/lib/season";
import type { FeeAudience, PlayerListItem, SeasonFeeLine } from "@/lib/types/db";

/** Fila serializable del listado /admin/pagos: lo que debe y lo que falta de cada jugador. */
export type PlayerFeeRow = {
  id: string;
  full_name: string;
  team_name: string | null;
  audience: FeeAudience | null;
  obligations: FeeObligation[];
  /** Cobros anotados que no cierran ninguna línea (sin fee_code o cuota antigua sin mes). */
  unassigned: { count: number; total: number };
};

export function buildPlayerFeeRows({
  players,
  lines,
  paymentsByPlayer,
  season,
  today,
}: {
  players: readonly PlayerListItem[];
  lines: readonly SeasonFeeLine[];
  paymentsByPlayer: ReadonlyMap<string, readonly FeePaymentLike[]>;
  season: SeasonId;
  today: Date;
}): PlayerFeeRow[] {
  return players.map((player) => {
    const audience = audienceForCategory(player.team?.category);
    const payments = paymentsByPlayer.get(player.id) ?? [];
    return {
      id: player.id,
      full_name: player.full_name,
      team_name: player.team?.name ?? null,
      audience,
      obligations: computeObligations({
        season,
        audience,
        paysExtendedMonthly: player.pays_extended_monthly,
        lines,
        payments,
        today,
      }),
      unassigned: unassignedPaidPayments(payments, lines),
    };
  });
}
