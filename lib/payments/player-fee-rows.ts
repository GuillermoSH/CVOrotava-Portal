import {
  audienceForCategory,
  computeObligations,
  unassignedPaidPayments,
  type FeeObligation,
  type FeePaymentLike,
} from "@/lib/payments/fees";
import { shortPlayerName } from "@/lib/payments/short-name";
import type { SeasonId } from "@/lib/season";
import type { FeeAudience, SeasonFeeLine } from "@/lib/types/db";

/** Lo mínimo de un jugador que necesita el cálculo de tarifas. */
export type PaymentPlayer = {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  pays_extended_monthly: boolean;
  team: { name: string; category: string } | null;
};

/** Cobro anotado de la temporada, tal y como lo necesita la matriz (editar / anular). */
export type PlayerPaymentFact = FeePaymentLike & {
  id: string;
  method: string | null;
  paid_date: string | null;
};

/** Fila serializable del listado /admin/pagos: lo que debe y lo que falta de cada jugador. */
export type PlayerFeeRow = {
  id: string;
  full_name: string;
  /** Primer nombre + primer apellido, para móvil en vertical. */
  short_name: string;
  team_name: string | null;
  audience: FeeAudience | null;
  obligations: FeeObligation[];
  /** Cobros pagados de la temporada, para pintar método e historial por celda. */
  payments: PlayerPaymentFact[];
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
  players: readonly PaymentPlayer[];
  lines: readonly SeasonFeeLine[];
  paymentsByPlayer: ReadonlyMap<string, readonly PlayerPaymentFact[]>;
  season: SeasonId;
  today: Date;
}): PlayerFeeRow[] {
  return players.map((player) => {
    const audience = audienceForCategory(player.team?.category);
    const payments = paymentsByPlayer.get(player.id) ?? [];
    return {
      id: player.id,
      full_name: player.full_name,
      short_name: shortPlayerName(player),
      team_name: player.team?.name ?? null,
      audience,
      payments: [...payments],
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
