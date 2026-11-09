import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { PendingGroup } from "@/lib/dashboard/pending";
import { reveal } from "@/lib/ui/reveal";

/**
 * Lo pendiente en toda la app, por áreas. Cada fila es un enlace a donde se resuelve (la lista de
 * jugadores ya filtrada, los pagos, el almacén…): nada de cifras sin salida.
 */
export function HomePending({
  groups,
  startTurn = 0,
}: Readonly<{ groups: readonly PendingGroup[]; startTurn?: number }>) {
  // Turno de cada título y fila, de arriba abajo.
  let turn = startTurn + 1;
  const turns = groups.map((group) => {
    const head = turn++;
    return { head, items: group.items.map(() => turn++) };
  });

  return (
    <section className="flex flex-col gap-3" aria-labelledby="pending-title">
      <div className="reveal" style={reveal(startTurn)}>
        <h2 id="pending-title" className="text-base font-semibold text-foreground">
          Por hacer
        </h2>
        <p className="text-sm text-muted-foreground">
          Lo que está pendiente en pagos, jugadores y ropa. Cada fila te lleva a resolverlo.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--club-border)] px-4 py-6 text-center text-sm text-muted-foreground">
          No hay nada pendiente.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group, g) => (
            <div key={group.id}>
              <h3 className="reveal mb-1 text-sm font-medium text-muted-foreground" style={reveal(turns[g].head)}>{group.title}</h3>
              <ul className="flex flex-col">
                {group.items.map((item, i) => (
                  <li
                    key={item.id}
                    className="reveal border-t border-[var(--club-border)] first:border-t-0"
                    style={reveal(turns[g].items[i])}
                  >
                    <Link
                      href={item.href}
                      className="group -mx-2 flex min-h-12 items-center justify-between gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--club-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{item.label}</span>
                        {item.detail ? (
                          <span className="block text-xs text-muted-foreground">{item.detail}</span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {item.valueLabel ?? item.count}
                        </span>
                        <ChevronRight
                          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
