import Link from "next/link";

import { signInWithPassword } from "@/app/(auth)/login/actions";
import { LoginAmbient } from "@/components/auth/LoginAmbient";
import { LoginSplash } from "@/components/auth/LoginSplash";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appRoutes } from "@/lib/constants";

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
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 py-10">
      <LoginAmbient />

      <LoginSplash>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>
              <Link
                href={appRoutes.home}
                className="text-primary underline-offset-4 hover:underline"
              >
                Volver al inicio
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {errorMessage ? (
              <p
                role="alert"
                className="status-badge status-badge--danger w-full justify-start text-left"
              >
                {errorMessage}
              </p>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dirección y staff
              </p>
              <GoogleSignInButton />
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" aria-hidden />
              o
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>

            <form action={signInWithPassword} className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Familias
              </p>
              <div className="space-y-2">
                <Label htmlFor="login-email">Correo electrónico</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.es"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Acceso privado · La Orotava, Tenerife
        </p>
      </LoginSplash>
    </div>
  );
}
