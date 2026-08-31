"use client";

import { LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";

import { useIsDesktop } from "@/lib/clothing/mobile";
import {
  readClothingOrdersView,
  writeClothingOrdersView,
  type ClothingOrdersView,
} from "@/lib/layout/clothing-storage";
import { cn } from "@/lib/utils";

export function OrdersViewToggle({
  view,
  onChange,
}: {
  view: ClothingOrdersView;
  onChange: (view: ClothingOrdersView) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Vista de pedidos"
      className="inline-flex items-center rounded-lg border border-[var(--club-border)] p-0.5"
    >
      <button
        type="button"
        onClick={() => onChange("kanban")}
        aria-pressed={view === "kanban"}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3.5 text-xs font-medium transition-colors",
          view === "kanban"
            ? "bg-[var(--club-brand-soft)] text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="size-3.5 shrink-0" aria-hidden />
        Kanban
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3.5 text-xs font-medium transition-colors",
          view === "list"
            ? "bg-[var(--club-brand-soft)] text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <List className="size-3.5 shrink-0" aria-hidden />
        Lista
      </button>
    </div>
  );
}

export function useClothingOrdersView(defaultView: ClothingOrdersView = "list") {
  const isDesktop = useIsDesktop();
  const [view, setView] = useState<ClothingOrdersView>(defaultView);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readClothingOrdersView();
    setView(isDesktop ? stored : "list");
    setHydrated(true);
  }, [isDesktop]);

  useEffect(() => {
    if (!hydrated || !isDesktop) return;
    setView(readClothingOrdersView());
  }, [hydrated, isDesktop]);

  function setAndPersist(next: ClothingOrdersView) {
    if (!isDesktop && next === "kanban") return;
    setView(next);
    writeClothingOrdersView(next);
  }

  return [view, setAndPersist] as const;
}
