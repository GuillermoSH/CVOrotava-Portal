export type ShowcasePlayer = {
  id: string;
  name: string;
  familyId: string;
  familyName: string;
  team: string;
  groupId: ShowcaseFeeGroupId;
};

export type ShowcasePaymentMethod = "transferencia" | "efectivo";

export type ShowcaseFeeGroupId =
  | "base-infantil"
  | "base-cadete"
  | "senior"
  | "aficionado";

export type ShowcaseFeeGroup = {
  id: ShowcaseFeeGroupId;
  label: string;
  monthlyAmount: number;
  concept: string;
  startMonth: number;
  endMonth: number;
};

export type ShowcasePlayerOverride = {
  playerId: string;
  monthlyAmount: number;
  note: string;
};

export type ShowcaseChargeStatus = "pendiente" | "pagado";

export type ShowcaseCharge = {
  id: string;
  playerId: string;
  playerName: string;
  familyName: string;
  groupId: ShowcaseFeeGroupId;
  concept: string;
  amount: number;
  monthKey: string;
  status: ShowcaseChargeStatus;
  method?: ShowcasePaymentMethod;
  paidAt?: string;
};

export type ShowcasePayment = {
  id: string;
  playerId: string;
  playerName: string;
  familyName: string;
  concept: string;
  amount: number;
  method: ShowcasePaymentMethod;
  paidAt: string;
  note?: string;
};

export const showcasePlayers: ShowcasePlayer[] = [
  {
    id: "pl-001",
    name: "Aitana Acosta",
    familyId: "fa-01",
    familyName: "Familia Acosta",
    team: "Infantil A",
    groupId: "base-infantil",
  },
  {
    id: "pl-002",
    name: "Bruno Acosta",
    familyId: "fa-01",
    familyName: "Familia Acosta",
    team: "Infantil B",
    groupId: "base-infantil",
  },
  {
    id: "pl-003",
    name: "Carla Benitez",
    familyId: "fa-02",
    familyName: "Familia Benitez",
    team: "Cadete A",
    groupId: "base-cadete",
  },
  {
    id: "pl-004",
    name: "Diego Benitez",
    familyId: "fa-02",
    familyName: "Familia Benitez",
    team: "Cadete B",
    groupId: "base-cadete",
  },
  {
    id: "pl-005",
    name: "Elena Correa",
    familyId: "fa-03",
    familyName: "Familia Correa",
    team: "Senior F",
    groupId: "senior",
  },
  {
    id: "pl-006",
    name: "Fabio Correa",
    familyId: "fa-03",
    familyName: "Familia Correa",
    team: "Aficionado M",
    groupId: "aficionado",
  },
];

export const showcasePaymentConcepts = [
  "Cuota mensual",
  "Cuota trimestral",
  "Reserva de ropa",
] as const;

export const showcaseFeeGroups: ShowcaseFeeGroup[] = [
  {
    id: "base-infantil",
    label: "Base Infantil",
    monthlyAmount: 45,
    concept: "Cuota base infantil",
    startMonth: 9,
    endMonth: 7,
  },
  {
    id: "base-cadete",
    label: "Base Cadete",
    monthlyAmount: 55,
    concept: "Cuota base cadete",
    startMonth: 9,
    endMonth: 7,
  },
  {
    id: "senior",
    label: "Senior",
    monthlyAmount: 65,
    concept: "Cuota senior",
    startMonth: 9,
    endMonth: 7,
  },
  {
    id: "aficionado",
    label: "Aficionado",
    monthlyAmount: 40,
    concept: "Cuota aficionado",
    startMonth: 9,
    endMonth: 7,
  },
];

export const showcasePlayerOverrides: ShowcasePlayerOverride[] = [
  {
    playerId: "pl-001",
    monthlyAmount: 60,
    note: "Entrena 4 dias por semana",
  },
  {
    playerId: "pl-005",
    monthlyAmount: 75,
    note: "Cuota senior especial",
  },
];

export const showcaseSeasonMonths = [
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
] as const;

export const showcaseChargeSeed: ShowcaseCharge[] = [
  {
    id: "ch-001",
    playerId: "pl-001",
    playerName: "Aitana Acosta",
    familyName: "Familia Acosta",
    groupId: "base-infantil",
    concept: "Cuota base infantil",
    amount: 60,
    monthKey: "2026-04",
    status: "pagado",
    method: "transferencia",
    paidAt: "2026-04-08",
  },
  {
    id: "ch-002",
    playerId: "pl-001",
    playerName: "Aitana Acosta",
    familyName: "Familia Acosta",
    groupId: "base-infantil",
    concept: "Cuota base infantil",
    amount: 60,
    monthKey: "2026-05",
    status: "pendiente",
  },
  {
    id: "ch-003",
    playerId: "pl-003",
    playerName: "Carla Benitez",
    familyName: "Familia Benitez",
    groupId: "base-cadete",
    concept: "Cuota base cadete",
    amount: 55,
    monthKey: "2026-05",
    status: "pendiente",
  },
  {
    id: "ch-004",
    playerId: "pl-005",
    playerName: "Elena Correa",
    familyName: "Familia Correa",
    groupId: "senior",
    concept: "Cuota senior",
    amount: 75,
    monthKey: "2026-05",
    status: "pendiente",
  },
];

export const showcasePaymentsSeed: ShowcasePayment[] = [
  {
    id: "sp-001",
    playerId: "pl-001",
    playerName: "Aitana Acosta",
    familyName: "Familia Acosta",
    concept: "Cuota mensual",
    amount: 45,
    method: "transferencia",
    paidAt: "2026-05-06",
    note: "Recibo enviado por correo",
  },
  {
    id: "sp-002",
    playerId: "pl-003",
    playerName: "Carla Benitez",
    familyName: "Familia Benitez",
    concept: "Cuota trimestral",
    amount: 120,
    method: "efectivo",
    paidAt: "2026-05-05",
  },
  {
    id: "sp-003",
    playerId: "pl-005",
    playerName: "Elena Correa",
    familyName: "Familia Correa",
    concept: "Reserva de ropa",
    amount: 35,
    method: "transferencia",
    paidAt: "2026-05-03",
  },
];
