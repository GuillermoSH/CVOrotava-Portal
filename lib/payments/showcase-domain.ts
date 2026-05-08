import type {
  ShowcaseCharge,
  ShowcaseFeeGroup,
  ShowcasePayment,
  ShowcasePaymentMethod,
  ShowcasePlayerOverride,
  ShowcasePlayer,
} from "@/lib/mocks/payments-showcase";

export const RISK_AMOUNT_THRESHOLD_EUR = 120;

function createLocalId(prefix: string) {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `${prefix}-${randomUuid}`;
  const fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${fallback}`;
}

export function filterPlayers(players: ShowcasePlayer[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return players;

  return players.filter((player) => {
    return (
      player.name.toLowerCase().includes(normalized) ||
      player.familyName.toLowerCase().includes(normalized) ||
      player.team.toLowerCase().includes(normalized)
    );
  });
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function parseAmount(value: string) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function buildMockPayment({
  player,
  concept,
  amount,
  method,
  note,
}: {
  player: ShowcasePlayer;
  concept: string;
  amount: number;
  method: ShowcasePaymentMethod;
  note: string;
}): ShowcasePayment {
  return {
    id: createLocalId("sp"),
    playerId: player.id,
    playerName: player.name,
    familyName: player.familyName,
    concept,
    amount,
    method,
    paidAt: todayIsoDate(),
    note: note.trim() || undefined,
  };
}

export function requiresRiskConfirmation({
  amount,
  method,
  lastMethod,
}: {
  amount: number;
  method: ShowcasePaymentMethod;
  lastMethod?: ShowcasePaymentMethod;
}) {
  if (amount >= RISK_AMOUNT_THRESHOLD_EUR) return true;
  if (lastMethod && lastMethod !== method) return true;
  return false;
}

export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export function dedupeChargeKey(charge: {
  playerId: string;
  monthKey: string;
  concept: string;
}) {
  return `${charge.playerId}::${charge.monthKey}::${charge.concept}`.toLowerCase();
}

export function generateSeasonCharges({
  players,
  groups,
  overrides,
  months,
  existingCharges,
}: {
  players: ShowcasePlayer[];
  groups: ShowcaseFeeGroup[];
  overrides: ShowcasePlayerOverride[];
  months: readonly string[];
  existingCharges: ShowcaseCharge[];
}) {
  const existingByKey = new Set(existingCharges.map((charge) => dedupeChargeKey(charge)));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const overrideByPlayerId = new Map(overrides.map((override) => [override.playerId, override]));
  const newCharges: ShowcaseCharge[] = [];

  for (const player of players) {
    const group = groupById.get(player.groupId);
    if (!group) continue;
    const override = overrideByPlayerId.get(player.id);
    const amount = override?.monthlyAmount ?? group.monthlyAmount;
    const concept = group.concept;

    for (const monthKey of months) {
      const key = dedupeChargeKey({ playerId: player.id, monthKey, concept });
      if (existingByKey.has(key)) continue;

      newCharges.push({
        id: createLocalId("ch"),
        playerId: player.id,
        playerName: player.name,
        familyName: player.familyName,
        groupId: player.groupId,
        concept,
        amount,
        monthKey,
        status: "pendiente",
      });
      existingByKey.add(key);
    }
  }

  return [...existingCharges, ...newCharges];
}

export function getPendingCharges(charges: ShowcaseCharge[]) {
  return charges
    .filter((charge) => charge.status === "pendiente")
    .sort((a, b) => `${a.monthKey}-${a.playerName}`.localeCompare(`${b.monthKey}-${b.playerName}`));
}

export function registerPendingChargePayment({
  charges,
  chargeId,
  method,
}: {
  charges: ShowcaseCharge[];
  chargeId: string;
  method: ShowcasePaymentMethod;
}) {
  const paidAt = todayIsoDate();
  const chargeToPay = charges.find((charge) => charge.id === chargeId);
  if (!chargeToPay) {
    return { charges, payment: null };
  }

  const paidCharge: ShowcaseCharge = { ...chargeToPay, status: "pagado", method, paidAt };
  const nextCharges = charges.map((charge) => (charge.id === chargeId ? paidCharge : charge));

  const payment: ShowcasePayment = {
    id: createLocalId("sp"),
    playerId: paidCharge.playerId,
    playerName: paidCharge.playerName,
    familyName: paidCharge.familyName,
    concept: `${paidCharge.concept} (${paidCharge.monthKey})`,
    amount: paidCharge.amount,
    method,
    paidAt,
  };

  return { charges: nextCharges, payment };
}
