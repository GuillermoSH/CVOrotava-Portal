"use client";

import { Mail } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { notifyCriticalDebtors } from "@/lib/actions/notifications";
import type { CriticalDebtor } from "@/lib/mocks/admin";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function CriticalDebtorsCard({
  debtors,
  emailConfigured,
}: {
  debtors: readonly CriticalDebtor[];
  /** Cuando exista `RESEND_API_KEY`, el CTA puede habilitarse para integración futura. */
  emailConfigured: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const count = debtors.length;
  const totalBalance = debtors.reduce((acc, d) => acc + d.balance, 0);

  const helperId = "critical-debtors-email-helper";

  function handleNotify() {
    startTransition(async () => {
      const result = await notifyCriticalDebtors();
      if (result.ok) {
        toast.success(`Enviados ${result.sent} avisos.`);
        return;
      }
      if (result.reason === "email-not-configured") {
        toast.message("Envío de avisos pendiente de configurar Resend.");
        return;
      }
      toast.error("No hay destinatarios para avisar.");
    });
  }

  return (
    <Card size="sm" className="flex h-full flex-col">
      <CardHeader className="gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Morosos críticos
          </CardDescription>
          <span className="text-[11px] font-normal normal-case text-muted-foreground">
            ≥ 2 cuotas
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center pt-0">
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="pl-1 md:pl-2">
            <p className="text-4xl font-semibold tabular-nums tracking-tight text-destructive md:text-5xl">
              {count}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Deuda pendiente
            </p>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-destructive">
              {eur.format(totalBalance)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 pt-0">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full"
          disabled={!emailConfigured || isPending}
          aria-describedby={helperId}
          onClick={handleNotify}
        >
          <Mail className="size-4" aria-hidden />
          Avisar por correo
        </Button>
        <p id={helperId} className="text-center text-[11px] text-muted-foreground">
          {emailConfigured
            ? "Integración de correo preparada; envío real pendiente de activar."
            : "Pendiente de configurar Resend (variable RESEND_API_KEY)."}
        </p>
      </CardFooter>
    </Card>
  );
}
