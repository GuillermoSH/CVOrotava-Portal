"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Una pestaña que lleva más de este tiempo oculta se refresca al volver a verla. */
const STALE_AFTER_MS = 60_000;
/** Espera antes de refrescar tras un aviso de otra pestaña (junta guardados seguidos en uno). */
const DEBOUNCE_MS = 400;
const CHANNEL_NAME = "cvo-portal-sync";

function isServerAction(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "POST") return false;
  const headers = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  return headers ? new Headers(headers).has("next-action") : false;
}

/**
 * Mantiene al día las pestañas del Portal sin sondeos:
 *
 * 1. Cuando esta pestaña guarda algo (una Server Action que termina bien) avisa a las demás
 *    por BroadcastChannel. Es un único punto común: no hay que tocar cada formulario.
 * 2. Al recibir el aviso, la pestaña visible vuelve a pedir al servidor lo de su página
 *    (router.refresh conserva filtros y formularios a medias); la oculta lo deja marcado y
 *    se refresca al volver a ella.
 * 3. Además, una pestaña oculta más de un minuto se refresca al volver (por si el cambio lo
 *    hizo otro dispositivo u otra persona).
 */
export function TabFreshness() {
  const router = useRouter();
  const hiddenAt = useRef<number | null>(null);
  const stale = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refreshSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stale.current = false;
        router.refresh();
      }, DEBOUNCE_MS);
    };

    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);
    if (channel) {
      channel.onmessage = () => {
        if (document.visibilityState === "visible") refreshSoon();
        else stale.current = true;
      };
    }

    // Avisar a las demás pestañas cuando una Server Action de esta termina bien.
    const originalFetch = window.fetch;
    const patchedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      if (channel && response.ok && isServerAction(input, init)) {
        try {
          channel.postMessage({ at: Date.now() });
        } catch {
          // Canal cerrado: no pasa nada, las demás pestañas se pondrán al día al volver a ellas.
        }
      }
      return response;
    };
    window.fetch = patchedFetch;

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      const since = hiddenAt.current;
      hiddenAt.current = null;
      if (stale.current || (since !== null && Date.now() - since > STALE_AFTER_MS)) refreshSoon();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
      channel?.close();
    };
  }, [router]);

  return null;
}
