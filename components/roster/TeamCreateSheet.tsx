"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { FormInput, FormSelect } from "@/components/club/forms";
import { createTeamAction } from "@/lib/actions/roster/players";
import {
  TEAM_CATEGORIES,
  TEAM_CATEGORY_LABELS,
  TEAM_GENDER_LABELS,
  TEAM_GENDERS,
} from "@/lib/roster/constants";
import { getCurrentSeason } from "@/lib/season";
import { appToast } from "@/lib/toast";

export function TeamCreateSheet({
  open,
  onClose,
  season = getCurrentSeason(),
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  season?: string;
  onCreated: (teamId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof TEAM_CATEGORIES)[number]>("cadete");
  const [gender, setGender] = useState<(typeof TEAM_GENDERS)[number]>("female");

  function reset() {
    setName("");
    setCategory("cadete");
    setGender("female");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createTeamAction({
        name: name.trim(),
        category,
        gender,
        season,
      });
      if (!result.ok || !result.id) {
        appToast.error(result.ok ? "No se pudo crear el equipo" : result.error);
        return;
      }
      appToast.success("Equipo creado");
      onCreated(result.id);
      handleClose();
      router.refresh();
    });
  }

  return (
    <ClothingBottomSheet
      open={open}
      onClose={handleClose}
      title="Nuevo equipo"
      description="El equipo principal de la ficha. Las convocatorias a otras categorías no se controlan aquí."
      primaryAction={{
        label: "Crear equipo",
        pending,
        disabled: !name.trim(),
        onClick: handleSubmit,
      }}
      secondaryAction={{
        label: "Cancelar",
        onClick: handleClose,
      }}
    >
      <div className="flex flex-col gap-4">
        <FormInput
          label="Nombre"
          name="team-name"
          id="team-name"
          className="min-h-11"
          placeholder="Ej. Cadete femenino"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FormSelect
          label="Categoría"
          name="team-category"
          id="team-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as (typeof TEAM_CATEGORIES)[number])}
          options={TEAM_CATEGORIES.map((item) => ({
            value: item,
            label: TEAM_CATEGORY_LABELS[item],
          }))}
        />
        <FormSelect
          label="Género"
          name="team-gender"
          id="team-gender"
          value={gender}
          onChange={(e) => setGender(e.target.value as (typeof TEAM_GENDERS)[number])}
          options={TEAM_GENDERS.map((item) => ({
            value: item,
            label: TEAM_GENDER_LABELS[item],
          }))}
        />
      </div>
    </ClothingBottomSheet>
  );
}
