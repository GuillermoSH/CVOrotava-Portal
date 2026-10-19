import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type NeighborLink = { href: string; name: string } | null;

const BUTTON_CLASS =
  "inline-flex size-9 items-center justify-center rounded-lg border border-[var(--club-border)] bg-[var(--club-surface-2)] text-foreground transition-colors hover:bg-[var(--club-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function NavButton({
  link,
  label,
  children,
}: {
  link: NeighborLink;
  label: string;
  children: React.ReactNode;
}) {
  if (!link) {
    return (
      <span
        className={cn(BUTTON_CLASS, "cursor-default opacity-40 hover:bg-[var(--club-surface-2)]")}
        aria-hidden
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={link.href}
      className={BUTTON_CLASS}
      aria-label={`${label}: ${link.name}`}
      title={`${label}: ${link.name}`}
    >
      {children}
    </Link>
  );
}

/** Anterior / siguiente jugador de la lista desde la que se entró a la ficha. */
export function PlayerNeighborNav({
  position,
  total,
  prev,
  next,
}: {
  position: number;
  total: number;
  prev: NeighborLink;
  next: NeighborLink;
}) {
  return (
    <nav className="flex items-center gap-2" aria-label="Navegar entre jugadores">
      <NavButton link={prev} label="Jugador anterior">
        <ChevronLeft className="size-4" aria-hidden />
      </NavButton>
      <span className="min-w-14 text-center text-xs font-medium tabular-nums text-muted-foreground">
        {position} de {total}
      </span>
      <NavButton link={next} label="Jugador siguiente">
        <ChevronRight className="size-4" aria-hidden />
      </NavButton>
    </nav>
  );
}
