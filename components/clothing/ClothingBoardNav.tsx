"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: appRoutes.clothing.hub, label: "Marcador", match: "exact" as const },
  { href: appRoutes.clothing.orders, label: "Pedidos", match: "prefix" as const },
  { href: appRoutes.clothing.warehouse, label: "Almacén", match: "prefix" as const },
  { href: appRoutes.clothing.deliveries, label: "Entregas", match: "prefix" as const },
  { href: appRoutes.clothing.products, label: "Prendas", match: "prefix" as const },
];

export function ClothingBoardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Ropa" className="ropa-board-nav">
      <ul className="ropa-board-nav__list">
        {LINKS.map((link) => {
          const active =
            link.match === "exact"
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn("ropa-board-nav__link", active && "ropa-board-nav__link--active")}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
