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
  defaultTeamGenderForCategory,
  teamGenderOptionsForCategory,
  type TeamCategory,
  type TeamGender,
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
  const [category, setCategory] = useState<TeamCategory>("cadete");
  const [gender, setGender] = useState<TeamGender>(defaultTeamGenderForCategory("cadete"));

  const genderOptions = teamGenderOptionsForCategory(category);

  function reset() {
    setName("");
    setCategory("cadete");
    setGender(defaultTeamGenderForCategory("cadete"));
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleCategoryChange(next: TeamCategory) {
    setCategory(next);
    const options = teamGenderOptionsForCategory(next);
    if (!options.includes(gender)) {
      setGender(defaultTeamGenderForCategory(next));
    } else if (next === "aficionados" && gender !== "mixed") {
      // Prefiere Mixto al pasar a aficionados (caso habitual del club).
      setGender("mixed");
    }
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
          onChange={(e) => handleCategoryChange(e.target.value as TeamCategory)}
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
          onChange={(e) => setGender(e.target.value as TeamGender)}
          options={genderOptions.map((item) => ({
            value: item,
            label: TEAM_GENDER_LABELS[item],
          }))}
        />
      </div>
    </ClothingBottomSheet>
  );
}
