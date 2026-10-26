"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/club/Card";
import { FormInput } from "@/components/club/forms";
import {
  removePlayerExemptionAction,
  setPlayerExemptionAction,
} from "@/lib/actions/payments/exemptions";
import { formatSeasonShort } from "@/lib/season";
import { appToast } from "@/lib/toast";

const SUGGESTED_REASONS = ["Coordinación", "Cuerpo técnico", "Directiva"];

/**
 * Exención de pagos del jugador en su temporada (compartida con Team Manager). Un exento no
 * aparece en la matriz de pagos, no genera deuda ni avisos y no admite cobros hasta que se
 * quita aquí. Solo el admin puede cambiarla; el manager la ve.
 */
export function PlayerExemptionSection({
  playerId,
  season,
  exemption,
  canEdit,
}: Readonly<{
  playerId: string;
  season: string;
  exemption: { reason: string | null } | null;
  canEdit: boolean;
}>) {
  const router = useRouter();
  const listId = useId();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");

  // Un manager no puede cambiarla: si no hay exención no hay nada que mostrar.
  if (!exemption && !canEdit) return null;

  function save() {
    startTransition(async () => {
      const result = await setPlayerExemptionAction({ player_id: playerId, reason });
      if (!result.ok) {
        appToast.error("No se pudo guardar", result.error);
        return;
      }
      appToast.success("Marcado como exento de pagos");
      setEditing(false);
      setReason("");
      router.refresh();
    });
  }

  function unlock() {
    startTransition(async () => {
      const result = await removePlayerExemptionAction({ player_id: playerId });
      if (!result.ok) {
        appToast.error("No se pudo quitar la exención", result.error);
        return;
      }
      appToast.success("Exención quitada");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Exención de pagos
          {exemption ? <Badge variant="info">Exento · {formatSeasonShort(season)}</Badge> : null}
        </CardTitle>
        <CardDescription>
          {exemption
            ? "No aparece en la matriz de pagos, no genera deuda ni avisos y no se le pueden registrar cobros mientras siga exento."
            : "Para quien no paga cuotas esta temporada (coordinación, cuerpo técnico, un favor puntual…). Se gestiona igual desde Team Manager."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {exemption ? (
          <p className="text-sm text-foreground">
            Motivo: {exemption.reason ? exemption.reason : <span className="text-muted-foreground">sin indicar</span>}
          </p>
        ) : null}

        {canEdit && !exemption && editing ? (
          <div className="flex max-w-md flex-col gap-3">
            <FormInput
              label="Motivo (opcional)"
              name="exemption_reason"
              list={listId}
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Coordinación, cuerpo técnico…"
            />
            <datalist id={listId}>
              {SUGGESTED_REASONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <div className="flex gap-2">
              <Button type="button" disabled={pending} onClick={save}>
                {pending ? "Guardando…" : "Marcar como exento"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setReason("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {canEdit && !exemption && !editing ? (
          <div>
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              Marcar como exento
            </Button>
          </div>
        ) : null}

        {canEdit && exemption ? (
          <div>
            <Button type="button" variant="secondary" disabled={pending} onClick={unlock}>
              {pending ? "…" : "Quitar exención"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
