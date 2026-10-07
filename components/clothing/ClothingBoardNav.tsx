"use client";

import { usePathname } from "next/navigation";

import { SegmentedNav } from "@/components/club/SegmentedControl";
import { appRoutes } from "@/lib/constants";

const LINKS = [
  { href: appRoutes.clothing.hub, label: "Resumen", match: "exact" as const },
  { href: appRoutes.clothing.orders, label: "Pedidos", match: "prefix" as const },
  { href: appRoutes.clothing.warehouse, label: "Almacén", match: "prefix" as const },
  { href: appRoutes.clothing.deliveries, label: "Entregas", match: "prefix" as const },
  { href: appRoutes.clothing.products, label: "Prendas", match: "prefix" as const },
];

export function ClothingBoardNav() {
  const pathname = usePathname();

  return (
    <SegmentedNav
      aria-label="Secciones de ropa"
      className="ropa-board-nav"
      size="sm"
      fullWidth
      items={LINKS.map((link) => {
        const active =
          link.match === "exact"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return {
          href: link.href,
          label: link.label,
          active,
        };
      })}
    />
  );
}
