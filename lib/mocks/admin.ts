export const adminKpis = {
  clothingPending: 14,
  criticalDebtors: 5,
  monthlyPayments: { paid: 23, target: 30 },
  totalRevenueYear: 18450,
  revenueThisMonth: 1820,
  clothingExpectedRevenue: 980,
} as const;

export type Payment = {
  id: string;
  parent: string;
  child: string;
  amount: number;
  method: "transferencia" | "efectivo";
  date: string;
};

/** Familias con mora simulada (solo maqueta). */
export const criticalDebtors = [
  { id: "d1", family: "Familia Martín", overdueMonths: 3, balance: 240 },
  { id: "d2", family: "Familia Ruiz", overdueMonths: 2, balance: 180 },
  { id: "d3", family: "Familia Vega", overdueMonths: 2, balance: 160 },
  { id: "d4", family: "Familia Oramas", overdueMonths: 2, balance: 150 },
  { id: "d5", family: "Familia Gil", overdueMonths: 2, balance: 120 },
] as const;

export const recentPayments: Payment[] = [
  {
    id: "p1",
    parent: "Familia Acosta",
    child: "Lucía Acosta",
    amount: 45,
    method: "transferencia",
    date: "2026-05-06",
  },
  {
    id: "p2",
    parent: "Familia Benítez",
    child: "Hugo Benítez",
    amount: 45,
    method: "efectivo",
    date: "2026-05-05",
  },
  {
    id: "p3",
    parent: "Familia Correa",
    child: "Martina Correa",
    amount: 90,
    method: "transferencia",
    date: "2026-05-04",
  },
  {
    id: "p4",
    parent: "Familia Delgado",
    child: "Leo Delgado",
    amount: 45,
    method: "efectivo",
    date: "2026-05-03",
  },
  {
    id: "p5",
    parent: "Familia Espino",
    child: "Nora Espino",
    amount: 45,
    method: "transferencia",
    date: "2026-05-02",
  },
  {
    id: "p6",
    parent: "Familia Fuentes",
    child: "Diego Fuentes",
    amount: 135,
    method: "transferencia",
    date: "2026-05-01",
  },
];
