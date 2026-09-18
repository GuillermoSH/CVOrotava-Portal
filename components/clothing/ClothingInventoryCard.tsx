import { MapPin } from "lucide-react";

import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { INVENTORY_SOURCE_LABELS, INVENTORY_STATUS_LABELS } from "@/lib/clothing/constants";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import type { ClothingInventoryLotWithDetails, ClothingInventoryStatus } from "@/lib/types/db";

export function InventorySourceBadge({
  sourceType,
}: {
  sourceType: ClothingInventoryLotWithDetails["source_type"];
}) {
  return (
    <Badge variant={sourceType === "manual" ? "outline" : "secondary"} className="text-[11px]">
      {INVENTORY_SOURCE_LABELS[sourceType]}
    </Badge>
  );
}

export function InventoryStatusBadge({ status }: { status: ClothingInventoryStatus }) {
  return (
    <Badge variant={status === "stored" ? "success" : "warning"}>
      {INVENTORY_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ClothingInventoryCard({
  lot,
  onAssign,
}: {
  lot: ClothingInventoryLotWithDetails;
  onAssign: () => void;
}) {
  const pending = lot.status === "pending_storage";

  return (
    <article className="clothing-list-card">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-semibold tracking-tight text-foreground">
          {formatProductShort(lot.product)}
        </p>
        <InventoryStatusBadge status={lot.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <InventorySourceBadge sourceType={lot.source_type} />
        <Badge variant="secondary" className="text-[11px]">
          Talla {formatClothingSize(lot.size)}
        </Badge>
        <Badge variant="secondary" className="text-[11px] tabular-nums">
          {lot.quantity} uds.
        </Badge>
      </div>

      <p className="mt-3 flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
        <span className={lot.location_path ? "truncate" : "text-muted-foreground/80 italic"}>
          {lot.location_path ?? "Sin ubicación asignada"}
        </span>
      </p>

      {pending ? (
        <Button
          type="button"
          variant="primary"
          className="btn-primary--block mt-4 min-h-11"
          onClick={onAssign}
        >
          Ubicar en caja
        </Button>
      ) : null}
    </article>
  );
}
