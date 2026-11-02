"use client";

import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { FormInput } from "@/components/club/forms";
import { SectionHeading, ToggleRow } from "@/components/roster/ToggleRow";
import {
  removePlayerExemptionAction,
  setPlayerExemptionAction,
} from "@/lib/actions/payments/exemptions";
import { formatSeasonShort } from "@/lib/season";
import { appToast } from "@/lib/toast";

/** Cómo paga el jugador: la tarifa de su categoría, la ampliada de base o la de sénior. */
export type PlayerFeeMode = "standard" | "extended" | "senior";

const SUGGESTED_REASONS = ["Coordinación", "Cuerpo técnico", "Directiva"];

export type PlayerExemptionInfo = {
  playerId: string;
  season: string;
  /** Exención vigente de la temporada; null = no está exento. */
  current: { reason: string | null } | null;
  /** Solo el admin cambia exenciones; el manager la ve. */
  canEdit: boolean;
};

/**
 * Bloque «Cuotas» de la ficha. Las opciones son excluyentes: al activar una (cuota ampliada,
 * paga como sénior o exento de pagos) las demás desaparecen hasta desactivarla.
 *
 * Ampliada y sénior se guardan con la ficha; la exención se guarda al momento (es compartida con
 * Team Manager y exige motivo), igual que antes.
 */
export function PlayerFeeSection({
  mode,
  onModeChange,
  showTariff,
  readOnly,
  exemption,
}: Readonly<{
  mode: PlayerFeeMode;
  onModeChange: (mode: PlayerFeeMode) => void;
  /** Categorías base: son las únicas con cuota ampliada o que pueden pagar como sénior. */
  showTariff: boolean;
  readOnly: boolean;
  /** null al crear (aún no hay jugador al que eximir). */
  exemption: PlayerExemptionInfo | null;
}>) {
  const router = useRouter();
  const listId = useId();
  const [pending, startTransition] = useTransition();
  const [exemptDraft, setExemptDraft] = useState(false);
  const [reason, setReason] = useState("");

  const exempt = exemption?.current ?? null;
  const canEditExemption = Boolean(exemption?.canEdit) && !readOnly;
  const showExemptOption = Boolean(exemption) && (canEditExemption || Boolean(exempt));
  const tariffActive = mode !== "standard";

  if (!showTariff && !showExemptOption) return null;

  function saveExemption() {
    if (!exemption) return;
    startTransition(async () => {
      const result = await setPlayerExemptionAction({ player_id: exemption.playerId, reason });
      if (!result.ok) {
        appToast.error("No se pudo guardar", result.error);
        return;
      }
      appToast.success("Marcado como exento de pagos");
      setExemptDraft(false);
      setReason("");
      router.refresh();
    });
  }

  function removeExemption() {
    if (!exemption) return;
    startTransition(async () => {
      const result = await removePlayerExemptionAction({ player_id: exemption.playerId });
      if (!result.ok) {
        appToast.error("No se pudo quitar la exención", result.error);
        return;
      }
      appToast.success("Exención quitada");
      router.refresh();
    });
  }

  const exemptActive = Boolean(exempt) || exemptDraft;
  const anyActive = tariffActive || exemptActive;

  return (
    <section className="flex flex-col gap-2 border-t border-[var(--club-border)] pt-5 md:pt-4">
      <SectionHeading icon={Wallet} title="Cuotas" />

      {showTariff && !exemptActive && (!anyActive || mode === "extended") ? (
        <ToggleRow
          id="pays-extended-monthly"
          compact
          label="Cuota mensual ampliada (30 €)"
          hint="Por defecto 25 €. Solo aplica en categorías base (minivoley–júnior) al generar cuotas."
          checked={mode === "extended"}
          disabled={readOnly}
          onChange={(on) => onModeChange(on ? "extended" : "standard")}
        />
      ) : null}

      {showTariff && !exemptActive && (!anyActive || mode === "senior") ? (
        <ToggleRow
          id="pays-as-senior"
          compact
          label="Paga como sénior"
          hint="Para quien entrena siempre con séniors: sus cuotas salen de la tarifa sénior. Lo ya cobrado (matrícula, etc.) sigue contando; la equipación de base deja de exigirse."
          checked={mode === "senior"}
          disabled={readOnly}
          onChange={(on) => onModeChange(on ? "senior" : "standard")}
        />
      ) : null}

      {showExemptOption && (!anyActive || exemptActive) ? (
        <ToggleRow
          id="exempt-from-payments"
          compact
          label={
            exempt && exemption
              ? `Exento de pagos · ${formatSeasonShort(exemption.season)}`
              : "Exento de pagos"
          }
          hint={
            exempt
              ? `No aparece en la matriz de pagos, no genera deuda ni avisos y no admite cobros mientras siga exento. Motivo: ${exempt.reason || "sin indicar"}.`
              : "Para quien no paga cuotas esta temporada (coordinación, cuerpo técnico, un favor puntual…). Se gestiona igual desde Team Manager."
          }
          checked={exemptActive}
          disabled={!canEditExemption || pending}
          onChange={(on) => {
            if (exempt) {
              if (!on) removeExemption();
              return;
            }
            setExemptDraft(on);
            if (!on) setReason("");
          }}
        />
      ) : null}

      {exemptDraft && !exempt ? (
        <div className="flex max-w-md flex-col gap-3 rounded-xl border border-[var(--club-border)] p-3">
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
            <Button type="button" disabled={pending} onClick={saveExemption}>
              {pending ? "Guardando…" : "Marcar como exento"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setExemptDraft(false);
                setReason("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
