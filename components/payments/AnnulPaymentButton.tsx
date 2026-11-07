"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { deletePaymentAction } from "@/lib/actions/payments/correct";
import { appToast } from "@/lib/toast";

/** Anula un cobro con confirmación en línea (dos pulsaciones, sin diálogos del navegador). */
export function AnnulPaymentButton({ paymentId, label = "Anular" }: Readonly<{ paymentId: string; label?: string }>) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);

  function annul() {
    start(async () => {
      const result = await deletePaymentAction({ id: paymentId });
      if (!result.ok) {
        appToast.error(result.error);
        setArmed(false);
        return;
      }
      appToast.success("Cobro anulado");
      router.refresh();
    });
  }

  if (!armed) {
    return (
      <Button type="button" variant="secondary" size="sm" className="min-h-9" onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <Button type="button" variant="primary" size="sm" className="min-h-9" disabled={pending} onClick={annul}>
        {pending ? "Anulando…" : "Confirmar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="min-h-9" disabled={pending} onClick={() => setArmed(false)}>
        Cancelar
      </Button>
    </span>
  );
}
