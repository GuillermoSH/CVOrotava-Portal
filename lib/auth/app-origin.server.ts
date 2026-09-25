import "server-only";

import type { NextRequest } from "next/server";

import {
  getConfiguredSiteOrigin,
  normalizeOrigin,
  resolveOriginFromHost,
  toAbsoluteAppUrl,
} from "@/lib/auth/app-origin";

export { toAbsoluteAppUrl } from "@/lib/auth/app-origin";

/** Evita redirects a `0.0.0.0` cuando el dev server escucha en todas las interfaces. */
export function getRequestOrigin(request: NextRequest): string {
  const fromHeaders = resolveOriginFromHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", ""),
  );
  if (fromHeaders) return fromHeaders;

  const configured = getConfiguredSiteOrigin();
  if (configured) return configured;

  return normalizeOrigin(request.nextUrl.origin) ?? "";
}
