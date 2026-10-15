"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import { deleteDraftOrderAction } from "@/lib/actions/clothing/orders";
import { appRoutes } from "@/lib/constants";
import { appToast } from "@/lib/toast";

export function DeleteDraftOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteDraftOrderAction({ order_id: orderId });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success("Borrador eliminado");
      setOpen(false);
      router.push(appRoutes.clothing.orders);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        Eliminar borrador
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        title="Eliminar borrador"
        description="Se borrará el pedido y sus líneas. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        pending={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
