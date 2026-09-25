"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/club/Input";
import { appRoutes } from "@/lib/constants";

export function ClothingHubSearch() {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const encoded = encodeURIComponent(q);

  const links = useMemo(
    () => [
      {
        href: q ? `${appRoutes.clothing.warehouse}?q=${encoded}` : appRoutes.clothing.warehouse,
        label: "Almacén",
      },
      {
        href: q ? `${appRoutes.clothing.orders}?q=${encoded}` : appRoutes.clothing.orders,
        label: "Pedidos",
      },
      {
        href: q ? `${appRoutes.clothing.products}?q=${encoded}` : appRoutes.clothing.products,
        label: "Prendas",
      },
    ],
    [encoded, q],
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--club-border)] bg-[var(--club-surface)] p-4">
      <label htmlFor="clothing-hub-search" className="text-sm font-medium text-foreground">
        Buscar en ropa
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="clothing-hub-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Prenda, pedido, proveedor, dorsal…"
          className="min-h-11 pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="btn-secondary inline-flex min-h-11 flex-1 items-center justify-center md:min-h-8 md:flex-none"
          >
            {q ? `Buscar en ${link.label}` : link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
