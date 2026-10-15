"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { appToast } from "@/lib/toast";

import { Input } from "@/components/club/Input";
import { updateOrderLineReceived } from "@/lib/actions/clothing/orders";
import { formatClothingSize } from "@/lib/clothing/formatSize";
import { formatProductShort } from "@/lib/clothing/formatProduct";
import type { ClothingOrderLineWithProduct } from "@/lib/types/db";
import { cn } from "@/lib/utils";

export function OrderLineReceivedEditor({
  line,
  layout = "table",
}: {
  line: ClothingOrderLineWithProduct;
  layout?: "mobile" | "table" | "chip";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ariaLabel = `Unidades recibidas de ${formatProductShort(line.product)}, talla ${formatClothingSize(line.size)}`;

  function handleBlur(value: string) {
    const qty = Number(value);
    if (Number.isNaN(qty) || qty < 0) return;
    if (qty === line.quantity_received) return;

    startTransition(async () => {
      const result = await updateOrderLineReceived({
        line_id: line.id,
        quantity_received: qty,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (layout === "chip") {
    return (
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={9999}
        defaultValue={line.quantity_received}
        disabled={pending}
        aria-label={ariaLabel}
        className="ropa-size-qty__input"
        onBlur={(e) => handleBlur(e.target.value)}
      />
    );
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      max={9999}
      defaultValue={line.quantity_received}
      disabled={pending}
      aria-label={ariaLabel}
      className={cn(
        "tabular-nums",
        layout === "mobile"
          ? "h-11 w-full max-w-[5.5rem] text-base"
          : "h-9 w-20",
      )}
      onBlur={(e) => handleBlur(e.target.value)}
    />
  );
}
