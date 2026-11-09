"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/club/Button";
import { assignPaymentFeeAction } from "@/lib/actions/payments/correct";
import { appToast } from "@/lib/toast";

/** Asigna un cobro a una línea de tarifa (concepto y mes) y recarga el control. */
export function AssignPaymentButton({
  paymentId,
  code,
  month,
  label,
  verb = "Asignar a",
}: Readonly<{ paymentId: string; code: string; month: number | null; label: string; verb?: string }>) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function assign() {
    start(async () => {
      const result = await assignPaymentFeeAction({ id: paymentId, fee_code: code, billing_month: month });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success("Cobro asignado", label);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="secondary" size="sm" className="min-h-9" disabled={pending} onClick={assign}>
      {pending ? "Asignando…" : `${verb} ${label}`}
    </Button>
  );
}
