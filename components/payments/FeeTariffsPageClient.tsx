"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { FormSelect } from "@/components/club/forms";
import { FeeLineEditor } from "@/components/payments/FeeLineEditor";
import { copySeasonFeesAction } from "@/lib/actions/payments/fees";
import { appRoutes } from "@/lib/constants";
import { FEE_AUDIENCES, FEE_AUDIENCE_LABELS } from "@/lib/payments/fees";
import { buildSeasonId, formatSeasonShort, seasonStartYear } from "@/lib/season";
import { appToast } from "@/lib/toast";
import type { FeeAudience, SeasonFeeLine } from "@/lib/types/db";

function AudienceBlock({
  season,
  audience,
  lines,
}: {
  season: string;
  audience: FeeAudience;
  lines: SeasonFeeLine[];
}) {
  const [adding, setAdding] = useState(false);
  const takenCodes = useMemo(() => new Set(lines.map((l) => l.code)), [lines]);

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`fees-${audience}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`fees-${audience}`} className="section-title">
          {FEE_AUDIENCE_LABELS[audience]}
        </h2>
        {!adding ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-10"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" aria-hidden />
            Añadir línea
          </Button>
        ) : null}
      </div>

      {lines.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">
          Sin líneas: esta categoría no genera cuotas en la temporada.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <FeeLineEditor
            key={`${line.id}:${line.amount}:${line.amount_extended}:${line.months.join(",")}:${line.label}:${line.due_date ?? ""}`}
            season={season}
            audience={audience}
            line={line}
            takenCodes={takenCodes}
          />
        ))}
        {adding ? (
          <FeeLineEditor
            season={season}
            audience={audience}
            line={null}
            takenCodes={takenCodes}
            onClose={() => setAdding(false)}
          />
        ) : null}
      </div>
    </section>
  );
}

export function FeeTariffsPageClient({
  season,
  currentSeason,
  seasonOptions,
  lines,
}: {
  season: string;
  currentSeason: string;
  seasonOptions: { value: string; label: string }[];
  lines: SeasonFeeLine[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const previousSeason = buildSeasonId(seasonStartYear(season) - 1);

  function changeSeason(next: string) {
    router.push(
      next === currentSeason
        ? appRoutes.payments.fees
        : `${appRoutes.payments.fees}?season=${encodeURIComponent(next)}`,
    );
  }

  function copyPrevious() {
    startTransition(async () => {
      const result = await copySeasonFeesAction({
        from_season: previousSeason,
        to_season: season,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      if (result.copied === 0) {
        appToast.error(`La temporada ${formatSeasonShort(previousSeason)} no tiene tarifa`);
        return;
      }
      appToast.success(`Tarifa copiada de ${formatSeasonShort(previousSeason)}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <FormSelect
          label="Temporada"
          name="fees-season"
          id="fees-season"
          value={season}
          onChange={(e) => changeSeason(e.target.value)}
          options={seasonOptions}
        />
        <p className="text-xs text-muted-foreground">
          La categoría del equipo decide qué tarifa se aplica. Un jugador sin equipo no genera
          cuotas.
        </p>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--club-border)] px-5 py-6">
          <div>
            <p className="font-medium text-foreground">
              Esta temporada aún no tiene tarifa
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cópiala de la temporada anterior y ajusta los importes, o añade las líneas a mano.
            </p>
          </div>
          <Button type="button" onClick={copyPrevious} disabled={pending}>
            Copiar de {formatSeasonShort(previousSeason)}
          </Button>
        </div>
      ) : null}

      {FEE_AUDIENCES.map((audience) => (
        <AudienceBlock
          key={audience}
          season={season}
          audience={audience}
          lines={lines.filter((line) => line.audience === audience)}
        />
      ))}
    </div>
  );
}
