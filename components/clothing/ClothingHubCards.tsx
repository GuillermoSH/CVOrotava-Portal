import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/club/Card";
import { appRoutes } from "@/lib/constants";
import type { ClothingHubKpis } from "@/lib/clothing/snapshots";
import { cn } from "@/lib/utils";

export function ClothingHubCards({ kpis }: { kpis: ClothingHubKpis }) {
  const links = [
    {
      href: appRoutes.clothing.orders,
      title: "Pedidos abiertos",
      value: kpis.openOrders,
      helper: "activos",
    },
    {
      href: appRoutes.clothing.warehouse,
      title: "Pendiente ubicar",
      value: kpis.pendingStorageUnits,
      helper: `${kpis.pendingStorageLots} lote${kpis.pendingStorageLots === 1 ? "" : "s"}`,
    },
    {
      href: appRoutes.clothing.warehouse,
      title: "En almacén",
      value: kpis.storedUnits,
      helper: "unidades",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {links.map((item, index) => (
        <Link
          key={item.title}
          href={item.href}
          className={cn(
            "group block min-h-11 rounded-[var(--radius-lg)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--club-brand)_40%,transparent)]",
            index === 2 && "col-span-2 lg:col-span-1",
          )}
        >
          <Card
            size="sm"
            className="h-full transition-[border-color,box-shadow] group-hover:border-[var(--club-border-hover)] group-hover:shadow-[var(--club-shadow-card-hover)]"
          >
            <CardHeader className="gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <CardTitle className="text-sm font-semibold leading-snug">{item.title}</CardTitle>
                <span className="shrink-0 text-xs text-muted-foreground">{item.helper}</span>
              </div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {item.value}
              </p>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
