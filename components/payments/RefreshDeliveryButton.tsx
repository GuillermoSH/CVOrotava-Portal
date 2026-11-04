"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/club/Button";
import { refreshDeliveryAction } from "@/lib/actions/payments/reminders";
import { appToast } from "@/lib/toast";

/** Consulta a Resend las entregas y rebotes de los correos recientes y recarga la página. */
export function RefreshDeliveryButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function refresh() {
    start(async () => {
      const result = await refreshDeliveryAction();
      if (!result.ok) {
        appToast.error("No se pudo consultar a Resend", result.error);
        return;
      }
      const rest = result.remaining > 0 ? ` Quedan ${result.remaining}: vuelve a pulsar.` : "";
      appToast.success("Entregas comprobadas", `${result.checked} correos revisados, ${result.updated} con novedades.${rest}`);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="secondary" className="min-h-10" disabled={pending} onClick={refresh}>
      {pending ? "Consultando…" : "Comprobar entregas"}
    </Button>
  );
}
