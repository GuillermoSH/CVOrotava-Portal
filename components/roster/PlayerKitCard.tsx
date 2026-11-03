"use client";

import { Shirt } from "lucide-react";

import { Button } from "@/components/club/Button";
import { FormInput } from "@/components/club/forms";
import { SizePicker } from "@/components/clothing/SizePicker";
import { CLOTHING_CATEGORY_LABELS } from "@/lib/clothing/constants";
import { GARMENT_CATEGORIES, type GarmentCategory } from "@/lib/roster/garment-sizes";
import type { ClothingSize } from "@/lib/types/db";
import { SectionHeading } from "@/components/roster/ToggleRow";

/**
 * Tarjeta de equipación del jugador: dorsal y talla de cada prenda. Hay quien usa una L en la
 * camiseta y una M en la sudadera, así que cada prenda tiene su talla; la talla general queda
 * como respaldo para quien es igual en todo (y para el resto del Portal que la usa).
 */
export function PlayerKitCard({
  jerseyNumber,
  onJerseyNumberChange,
  jerseyShared,
  generalSize,
  onGeneralSizeChange,
  garmentSizes,
  onGarmentSizeChange,
  onApplyGeneralToAll,
  readOnly,
  className,
}: Readonly<{
  jerseyNumber: string;
  onJerseyNumberChange: (value: string) => void;
  /** Otros jugadores del mismo equipo con este dorsal (aviso, no bloqueo). */
  jerseyShared?: string[];
  generalSize: ClothingSize | "";
  onGeneralSizeChange: (size: ClothingSize | "") => void;
  garmentSizes: Partial<Record<GarmentCategory, ClothingSize>>;
  onGarmentSizeChange: (category: GarmentCategory, size: ClothingSize | "") => void;
  onApplyGeneralToAll: () => void;
  readOnly: boolean;
  className?: string;
}>) {
  const filled = GARMENT_CATEGORIES.filter((category) => garmentSizes[category]).length;

  return (
    <section className={className}>
      <SectionHeading icon={Shirt} title="Equipación" />

      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start">
        <FormInput
          label="Dorsal"
          name="jersey_number"
          inputMode="numeric"
          maxLength={2}
          value={jerseyNumber}
          disabled={readOnly}
          onChange={(event) => onJerseyNumberChange(event.target.value.replace(/\D/g, ""))}
          placeholder="—"
          className="min-h-11 text-lg font-semibold tabular-nums md:min-h-10"
        />
        <SizePicker
          label="Talla general"
          value={generalSize}
          onChange={onGeneralSizeChange}
          id="player-size"
          clearable={!readOnly}
          disabled={readOnly}
        />
      </div>

      {jerseyShared && jerseyShared.length > 0 ? (
        <p className="text-xs text-[var(--club-warning-strong)]">
          El {jerseyNumber} también lo llevan {jerseyShared.join(", ")} en este equipo.
        </p>
      ) : null}

      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Talla por prenda</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {filled} de {GARMENT_CATEGORIES.length}
        </span>
      </div>

      <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        {GARMENT_CATEGORIES.map((category) => (
          <SizePicker
            key={category}
            label={CLOTHING_CATEGORY_LABELS[category]}
            value={garmentSizes[category] ?? ""}
            onChange={(size) => onGarmentSizeChange(category, size)}
            id={`size-`}
            clearable={!readOnly}
            disabled={readOnly}
          />
        ))}
      </div>

      {!readOnly && generalSize ? (
        <div>
          <Button type="button" variant="secondary" className="h-9 min-h-9 px-3 text-sm" onClick={onApplyGeneralToAll}>
            Usar la talla general en todas las prendas
          </Button>
        </div>
      ) : null}
    </section>
  );
}
