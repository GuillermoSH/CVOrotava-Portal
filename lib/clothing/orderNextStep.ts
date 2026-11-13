import { competitionNeedsJersey } from "@/lib/clothing/formatJersey";
import { summarizeOrderReceiving } from "@/lib/clothing/orderReceiving";
import { stockRollbackBlocker } from "@/lib/clothing/orderRollback";
import { appRoutes } from "@/lib/constants";
import type {
  ClothingInventoryLotWithDetails,
  ClothingOrderLineWithProduct,
  ClothingOrderStatus,
} from "@/lib/types/db";

/** Un paso de la fase actual, con el enlace al sitio donde se hace. */
export type NextStepItem = {
  label: string;
  done: boolean;
  optional?: boolean;
  /** Ancla de la misma página (`#...`) o ruta del almacén. */
  href?: string;
  /** Verbo del enlace de la fila. */
  go?: string;
  /** Texto del botón principal si este es el primer paso pendiente. */
  lead?: string;
};

export type OrderNextStep = {
  title: string;
  body: string;
  /** Lo que más importa de hoy, en una frase. */
  finding: { text: string; tone?: "warn" | "ok" };
  steps: NextStepItem[];
  /** Paso pendiente que pasa a ser el botón principal (solo al volver de serigrafía). */
  leadAction: { label: string; href: string } | null;
  /** Motivo por el que no se puede deshacer el stock del pedido, si ya existe. */
  stockBlocker: string | null;
  missingUnits: number;
  missingSizes: number;
};

const GUIDANCE: Record<ClothingOrderStatus, { title: string; body: string }> = {
  draft: {
    title: "Confirmar y enviar el pedido",
    body: "Edita el contenido si hace falta; al marcarlo como enviado, las líneas quedan bloqueadas.",
  },
  ordered: {
    title: "Verificar la recepción",
    body: "Anota lo recibido por talla y, cuando cuadre, marca el pedido como recibido.",
  },
  received: {
    title: "Enviar a serigrafía",
    body: "Si faltan unidades puedes enviar igual: lo no recibido no entrará al almacén después.",
  },
  at_serigraphy: {
    title: "Registrar la vuelta de serigrafía",
    body: "Al volver se crearán los lotes pendientes de ubicar en el almacén del club.",
  },
  returned_from_serigraphy: {
    title: "Numerar dorsales y ubicar",
    body: "Numera primero las camisetas de competición que lo necesiten y luego ubica cada lote en una caja.",
  },
  closed: { title: "Pedido cerrado", body: "No hay más pasos en este pedido." },
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function buildOrderNextStep({
  orderId,
  status,
  lines,
  lots,
  plannedCount,
}: {
  orderId: string;
  status: ClothingOrderStatus;
  lines: ClothingOrderLineWithProduct[];
  lots: ClothingInventoryLotWithDetails[];
  /** Entregas previstas asignadas en el pedido (pendientes y entregadas). */
  plannedCount: number;
}): OrderNextStep {
  const receiving = summarizeOrderReceiving(lines);
  const pendingLots = lots.filter((lot) => lot.status === "pending_storage");
  const missingJerseyLots = lots.filter((lot) =>
    competitionNeedsJersey(lot.product, lot.jersey_number),
  );
  const hasStock = status === "returned_from_serigraphy" || status === "closed";

  const warehouseHref = `${appRoutes.clothing.warehouse}?order=${orderId}&status=pending_storage`;
  const jerseyHref = `${appRoutes.clothing.warehouse}?order=${orderId}&missingJersey=1`;

  const steps: NextStepItem[] = [];
  if (status === "draft") {
    steps.push({ label: "Añadir las líneas del pedido", done: lines.length > 0 });
    steps.push({
      label:
        plannedCount > 0
          ? `Entregas previstas: ${plannedCount} asignadas`
          : "Asignar prendas a jugadores",
      done: plannedCount > 0,
      optional: true,
      href: "#entregas-previstas",
      go: "Ir",
    });
  } else if (status === "ordered") {
    steps.push({
      label: "Anotar las unidades recibidas",
      done: receiving.receivedUnits > 0,
      href: "#lineas",
      go: "Ir",
    });
    steps.push({
      label: "Que lo recibido cuadre con lo pedido",
      done: receiving.allComplete,
      href: "#lineas",
      go: "Revisar",
    });
  } else if (status === "received") {
    steps.push({
      label: "Sin unidades por llegar",
      done: receiving.missingUnits === 0,
      href: receiving.missingUnits > 0 ? "#lineas" : undefined,
      go: "Revisar",
    });
  } else if (hasStock) {
    if (
      status === "returned_from_serigraphy" &&
      (lots.length === 0 || missingJerseyLots.length > 0)
    ) {
      steps.push({
        label: "Numerar los dorsales de competición",
        done: missingJerseyLots.length === 0,
        href: jerseyHref,
        go: "Numerar",
        lead: `Numerar dorsales (${missingJerseyLots.length})`,
      });
    }
    if (status === "returned_from_serigraphy" || pendingLots.length > 0) {
      steps.push({
        label: "Ubicar cada lote en el almacén",
        done: pendingLots.length === 0,
        href: warehouseHref,
        go: "Ubicar",
        lead: `Ubicar lotes (${pendingLots.length})`,
      });
    }
  }

  const firstPending = steps.find((step) => !step.done && step.lead && step.href);
  const leadAction =
    status === "returned_from_serigraphy" && firstPending
      ? { label: firstPending.lead as string, href: firstPending.href as string }
      : null;

  let finding: OrderNextStep["finding"];
  switch (status) {
    case "draft":
      finding = {
        text:
          lines.length === 0
            ? "Aún sin líneas"
            : `${plural(receiving.orderedUnits, "ud", "uds")} en ${plural(lines.length, "línea", "líneas")}`,
      };
      break;
    case "ordered":
      finding =
        receiving.allComplete
          ? { text: "Recepción completa", tone: "ok" }
          : {
              text: `Faltan ${receiving.missingUnits} uds por recibir`,
              tone: receiving.receivedUnits > 0 ? "warn" : undefined,
            };
      break;
    case "received":
      finding =
        receiving.missingUnits === 0
          ? { text: "Todo recibido", tone: "ok" }
          : { text: `Faltan ${receiving.missingUnits} uds que no llegaron`, tone: "warn" };
      break;
    case "at_serigraphy":
      finding = { text: "En manos de la serigrafía" };
      break;
    case "returned_from_serigraphy": {
      const parts = [
        pendingLots.length > 0 ? `${plural(pendingLots.length, "lote", "lotes")} por ubicar` : null,
        missingJerseyLots.length > 0
          ? `${plural(missingJerseyLots.length, "dorsal", "dorsales")} por numerar`
          : null,
      ].filter(Boolean);
      finding =
        parts.length > 0
          ? { text: parts.join(" · "), tone: "warn" }
          : { text: "Todo ubicado", tone: "ok" };
      break;
    }
    case "closed":
      finding =
        pendingLots.length > 0
          ? { text: `${plural(pendingLots.length, "lote", "lotes")} sin ubicar`, tone: "warn" }
          : { text: "Pedido cerrado", tone: "ok" };
      break;
  }

  return {
    ...GUIDANCE[status],
    finding,
    steps,
    leadAction,
    stockBlocker: hasStock ? stockRollbackBlocker(lots, lines) : null,
    missingUnits: receiving.missingUnits,
    missingSizes: receiving.incompleteLines,
  };
}
