import { Mail } from "lucide-react";
import Link from "next/link";

import { appRoutes } from "@/lib/constants";
import type { CriticalDebtor } from "@/lib/payments/dashboard-stats";

import { buttonClassName } from "@/components/club/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/club/Card";

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function CriticalDebtorsCard({ debtors }: { debtors: readonly CriticalDebtor[] }) {
  const count = debtors.length;
  const totalBalance = debtors.reduce((acc, d) => acc + d.balance, 0);

  return (
    <Card size="sm" className="flex h-full flex-col">
      <CardHeader className="gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Morosos críticos</CardTitle>
          <span className="text-xs text-muted-foreground">con pagos atrasados</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center pt-0">
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="pl-1 md:pl-2">
            <p className="text-4xl font-semibold tabular-nums tracking-tight text-brand md:text-5xl">
              {count}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-sm text-muted-foreground">Deuda pendiente</p>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-brand">
              {eur.format(totalBalance)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Link
          href={appRoutes.payments.reminders}
          className={buttonClassName({ variant: "destructive", size: "sm", className: "w-full" })}
        >
          <Mail className="size-4" aria-hidden />
          Avisos por correo
        </Link>
      </CardFooter>
    </Card>
  );
}
