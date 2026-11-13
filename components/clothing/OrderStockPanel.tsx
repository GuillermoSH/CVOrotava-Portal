import Link from "next/link";

import { competitionNeedsJersey, formatJerseyNumber } from "@/lib/clothing/formatJersey";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { appRoutes } from "@/lib/constants";
import type { ClothingInventoryLotWithDetails } from "@/lib/types/db";

/** Stock que generó el pedido al volver de serigrafía: qué hay, dónde está y qué falta hacer. */
export function OrderStockPanel({
  orderId,
  lots,
}: {
  orderId: string;
  lots: ClothingInventoryLotWithDetails[];
}) {
  if (lots.length === 0) {
    return <p className="ord-empty">Este pedido aún no ha generado stock.</p>;
  }

  const warehouse = `${appRoutes.clothing.warehouse}?order=${orderId}`;
  const sorted = [...lots].sort(
    (a, b) =>
      Number(b.status === "pending_storage") - Number(a.status === "pending_storage") ||
      formatProductShort(a.product).localeCompare(formatProductShort(b.product), "es"),
  );

  return (
    <div className="ord-lines">
      <ul className="ord-rows">
        {sorted.map((lot) => {
          const needsJersey = competitionNeedsJersey(lot.product, lot.jersey_number);
          const pending = lot.status === "pending_storage";
          return (
            <li key={lot.id} className="ord-row ord-row--stock">
              <div className="ord-row__name">
                <h3>{formatProductShort(lot.product)}</h3>
                <p>
                  {formatClothingSize(lot.size)} · {lot.quantity} {lot.quantity === 1 ? "ud" : "uds"}
                  {lot.jersey_number != null ? ` · ${formatJerseyNumber(lot.jersey_number)}` : ""}
                </p>
              </div>
              <p className={pending ? "ord-row__where ord-row__where--warn" : "ord-row__where"}>
                {pending ? "Sin ubicar" : (lot.location_path ?? "En almacén")}
                {needsJersey ? " · sin dorsal" : ""}
              </p>
              <div className="ord-row__action">
                {needsJersey ? (
                  <Link
                    href={`${appRoutes.clothing.warehouse}?order=${orderId}&missingJersey=1`}
                    className="btn-secondary btn-sm inline-flex min-h-11 items-center md:min-h-8"
                  >
                    Numerar
                  </Link>
                ) : pending ? (
                  <Link
                    href={`${warehouse}&status=pending_storage`}
                    className="btn-secondary btn-sm inline-flex min-h-11 items-center md:min-h-8"
                  >
                    Ubicar
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <Link href={warehouse} className="ord-step__go w-fit">
        Abrir en el almacén
      </Link>
    </div>
  );
}
