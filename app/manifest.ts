import type { MetadataRoute } from "next";

import { CLUB_NAME, CLUB_NAME_SHORT } from "@/lib/brand/club";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${CLUB_NAME} — Portal`,
    short_name: CLUB_NAME_SHORT,
    description: `Portal de ${CLUB_NAME}: familias y dirección.`,
    lang: "es",
    // "/" redirige a /login o a la home según el rol de la sesión.
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0d0f",
    theme_color: "#0d0d0f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      { src: "/screenshots/portal-wide.png", sizes: "1280x720", type: "image/png", form_factor: "wide", label: "Portal del club" },
      { src: "/screenshots/portal-narrow.png", sizes: "720x1280", type: "image/png", form_factor: "narrow", label: "Portal del club" },
    ],
  };
}
