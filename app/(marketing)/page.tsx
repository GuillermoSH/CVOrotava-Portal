import Link from "next/link";

import { Logo } from "@/components/shared/Logo";
import { PaletteSwatches } from "@/components/shared/PaletteSwatches";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { appRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="size-10" />
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Club Voleibol Orotava
              </p>
              <p className="text-xs text-muted-foreground">
                Portal padres y dirección
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle align="end" />
            <Link
              href={appRoutes.login}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12 md:px-8">
        <section className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest text-brand">
            Volleyball club
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Gestión de cuotas y reserva de ropa del club
          </h1>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            Próximamente: anotación de pagos (transferencia o presencial) y
            reservas de equipación. Stack: Next.js, Supabase, Tailwind y
            shadcn/ui.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Paleta (no puros)</h2>
          <p className="text-xs text-muted-foreground">
            Cambia el tema arriba para ver los mismos tokens en claro u oscuro.
          </p>
          <PaletteSwatches />
        </section>
      </main>
    </div>
  );
}
