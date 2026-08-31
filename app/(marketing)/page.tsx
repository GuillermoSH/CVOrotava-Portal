import Link from "next/link";

import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { appRoutes } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="flex min-h-[100svh] flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <Logo className="size-10" px={40} />
            <div>
              <p className="text-sm font-semibold tracking-tight">C.V. Orotava</p>
              <p className="text-xs text-muted-foreground">Portal del club</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle variant="compact" />
            <Link href={appRoutes.login} className="btn-primary btn-sm">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 20% 0%, var(--club-brand-soft), transparent 65%)",
            }}
          />
          <div className="relative mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Familias y dirección
            </p>
            <h1 className="mt-4 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-[-0.03em] md:text-5xl">
              Cuotas, pagos y reserva de ropa en un solo sitio
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Portal privado del Club Voleibol Orotava para consultar cuotas, anotar
              pagos y gestionar la equipación de la temporada.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={appRoutes.login} className="btn-primary btn-primary--lg">
                Acceder al portal
              </Link>
              <p className="text-sm text-muted-foreground">
                Solo usuarios dados de alta por el club
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
          <ul className="grid gap-4 sm:grid-cols-3">
            <li className="club-card club-card--sm !p-4">
              <p className="text-sm font-semibold text-foreground">Cuotas</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Consulta el estado de las cuotas de tu familia.
              </p>
            </li>
            <li className="club-card club-card--sm !p-4">
              <p className="text-sm font-semibold text-foreground">Pagos</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Anotación de transferencias y pagos en efectivo.
              </p>
            </li>
            <li className="club-card club-card--sm !p-4">
              <p className="text-sm font-semibold text-foreground">Ropa</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Reserva de equipación del club cuando esté disponible.
              </p>
            </li>
          </ul>
        </section>
      </main>

      <footer className="mt-auto border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            <span className="font-medium text-foreground">Club Voleibol Orotava</span>
            {" · "}
            La Orotava, Tenerife
          </p>
          <p>Acceso privado · Cuentas gestionadas por el club</p>
        </div>
      </footer>
    </div>
  );
}
