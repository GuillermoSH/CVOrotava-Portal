"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ClothingBottomSheet,
  ClothingSheetOption,
} from "@/components/clothing/ClothingBottomSheet";
import { Select } from "@/components/club/Select";
import { Label } from "@/components/club/Label";
import {
  CLOTHING_SIZE_GROUPS,
  CLOTHING_SIZE_LABELS,
} from "@/lib/clothing/constants";
import type { ClothingSize } from "@/lib/types/db";
import { cn } from "@/lib/utils";

export function SizePicker({
  value,
  onChange,
  id = "size",
}: {
  value: ClothingSize | "";
  onChange: (size: ClothingSize) => void;
  id?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const labelText = value ? CLOTHING_SIZE_LABELS[value] : "Selecciona talla…";

  const selectOptions = useMemo(
    () =>
      CLOTHING_SIZE_GROUPS.map((group) => ({
        label: group.label,
        options: group.sizes.map((size) => ({
          value: size,
          label: CLOTHING_SIZE_LABELS[size],
        })),
      })),
    [],
  );

  function select(size: ClothingSize) {
    onChange(size);
    setSheetOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label id={`${id}-label`}>Talla</Label>

      <button
        type="button"
        aria-labelledby={`${id}-label`}
        onClick={() => setSheetOpen(true)}
        className={cn(
          "form-input flex min-h-11 items-center justify-between gap-2 text-left md:hidden",
          !value && "text-muted-foreground",
        )}
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <div className="hidden md:block">
        <Select
          id={id}
          aria-label="Talla"
          value={value}
          onChange={(next) => onChange(next as ClothingSize)}
          options={selectOptions}
          placeholder="Selecciona talla…"
        />
      </div>

      <ClothingBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Seleccionar talla"
        secondaryAction={{
          label: "Cerrar",
          onClick: () => setSheetOpen(false),
        }}
      >
        <div className="flex max-h-[55dvh] flex-col gap-4 overflow-y-auto">
          {CLOTHING_SIZE_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {group.sizes.map((size) => (
                  <ClothingSheetOption
                    key={size}
                    selected={value === size}
                    onSelect={() => select(size)}
                    className="min-h-11 justify-center px-2 py-2 text-center"
                  >
                    <span className="font-medium tabular-nums">{CLOTHING_SIZE_LABELS[size]}</span>
                  </ClothingSheetOption>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ClothingBottomSheet>
    </div>
  );
}
