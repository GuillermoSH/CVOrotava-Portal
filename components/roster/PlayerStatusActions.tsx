"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/club/Button";
import { setPlayerActiveAction } from "@/lib/actions/roster/players";
import type { Player } from "@/lib/types/db";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const stickyActionClass = "min-h-9 h-9 px-3 text-sm";

export function PlayerStatusActions({
  player,
  className,
}: {
  player: Player;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setPlayerActiveAction({
        id: player.id,
        is_active: !player.is_active,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(player.is_active ? "Jugador dado de baja" : "Jugador reactivado");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={player.is_active ? "secondary" : "primary"}
      className={cn(stickyActionClass, className)}
      disabled={pending}
      onClick={toggle}
    >
      {pending ? "…" : player.is_active ? "Dar de baja" : "Reactivar"}
    </Button>
  );
}
