import { appRoutes } from "@/lib/constants";

const INVALID_PUBLIC_HOSTS = new Set(["0.0.0.0", "::", "[::]"]);

export function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.includes("://") ? value : `http://${value}`);
    if (INVALID_PUBLIC_HOSTS.has(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Fallback en dev LAN cuando el navegador no tiene un origen válido (`NEXT_PUBLIC_SITE_URL`). */
export function getConfiguredSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return "";
  return normalizeOrigin(configured) ?? "";
}

export function resolveOriginFromHost(host: string | null, proto?: string | null): string {
  if (!host) return "";

  const hostValue = host.split(",")[0]?.trim() ?? "";
  const hostname = hostValue.split(":")[0] ?? "";
  if (!hostValue || INVALID_PUBLIC_HOSTS.has(hostname)) return "";

  const scheme = proto?.split(",")[0]?.trim() || "http";
  return normalizeOrigin(`${scheme}://${hostValue}`) ?? "";
}

export function toAbsoluteAppUrl(path: string, origin: string): string {
  return new URL(path, origin).toString();
}

/** URL de retorno OAuth (sin query params; Supabase valida la URL exacta). */
export function portalOAuthRedirectUrl(fallbackOrigin?: string): string {
  const fromBrowser = fallbackOrigin ? (normalizeOrigin(fallbackOrigin) ?? "") : "";
  const origin = fromBrowser || getConfiguredSiteOrigin();

  if (!origin) {
    throw new Error("No se pudo determinar el origen para OAuth.");
  }

  return new URL(appRoutes.authCallback, origin).toString();
}
