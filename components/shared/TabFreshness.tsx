"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Una pestaña que lleva más de este tiempo oculta se refresca al volver a verla. */
const STALE_AFTER_MS = 60_000;

/**
 * Con varias pestañas abiertas, las que quedan en segundo plano se quedan con datos viejos
 * (cobros, ropa, jugadores). Al volver a una pestaña oculta más de un minuto se vuelve a
 * pedir al servidor lo de la página actual (router.refresh conserva el estado del cliente:
 * filtros, formularios a medias). Una sola petición por vuelta, sin sondeos en segundo plano.
 */
export function TabFreshness() {
  const router = useRouter();
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      const since = hiddenAt.current;
      hiddenAt.current = null;
      if (since !== null && Date.now() - since > STALE_AFTER_MS) router.refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  return null;
}
