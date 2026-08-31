import { redirect } from "next/navigation";

import { LoginScreen } from "@/components/auth/LoginScreen";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";
import { roleHomeRoute, requirePortalRole } from "@/lib/auth/portal-access";

const ERROR_MESSAGES: Record<string, string> = {
  oauth: "No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.",
  "no-email": "Tu cuenta de Google no tiene un correo asociado; no podemos verificarte.",
  "no-club-account": "Ese correo no está dado de alta en el club.",
  "sin-acceso-portal":
    "Tu cuenta no tiene acceso al Portal. Si crees que es un error, contacta con dirección.",
  credenciales: "Correo o contraseña incorrectos.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isDevAuthBypassEnabled()) {
    const role = await requirePortalRole();
    redirect(roleHomeRoute(role));
  }

  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? null) : null;

  return <LoginScreen errorMessage={errorMessage} />;
}
