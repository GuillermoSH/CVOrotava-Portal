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
    <div className="ropa-search">
      <label htmlFor="clothing-hub-search" className="ropa-search__label">
        Buscar
      </label>
      <div className="ropa-search__field">
        <Search className="ropa-search__icon" aria-hidden />
        <Input
          id="clothing-hub-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Prenda, pedido, proveedor, dorsal…"
          className="min-h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="ropa-search__targets">
        {links.map((link) => (
          <Link key={link.label} href={link.href} className="ropa-search__target">
            {q ? `En ${link.label}` : link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
