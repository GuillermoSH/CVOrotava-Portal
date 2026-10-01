"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { FormInput, FormSelect } from "@/components/club/forms";
import { quickCreatePlayerAction } from "@/lib/actions/roster/players";
import { formatTeamCategory } from "@/lib/roster/constants";
import { appToast } from "@/lib/toast";
import type { Team } from "@/lib/types/db";

export function QuickAddPlayerSheet({
  open,
  onClose,
  teams,
  season,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  teams: Team[];
  season: string;
  onCreated?: (playerId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const teamOptions = [
    { value: "", label: "Sin equipo (se completa luego)" },
    ...teams.map((team) => ({
      value: team.id,
      label: `${team.name} · ${formatTeamCategory(team.category)}`,
    })),
  ];

  function reset() {
    setFirstName("");
    setLastName("");
    setTeamId("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Indica nombre y apellidos");
      return;
    }
    startTransition(async () => {
      const result = await quickCreatePlayerAction({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        team_id: teamId || null,
        season,
      });
      if (!result.ok || !result.id) {
        setError(result.ok ? "No se pudo crear el jugador" : result.error);
        return;
      }
      appToast.success(`${firstName.trim()} dado de alta — completa su ficha cuando puedas`);
      onCreated?.(result.id);
      handleClose();
      router.refresh();
    });
  }

  return (
    <ClothingBottomSheet
      open={open}
      onClose={handleClose}
      title="Alta rápida"
      description="Solo nombre y apellidos, para tenerlo ya en el sistema y anotar matrícula, papeles o foto en cuanto lleguen. El resto de la ficha se completa luego, editando al jugador."
      primaryAction={{
        label: "Dar de alta",
        pending,
        disabled: !firstName.trim() || !lastName.trim(),
        onClick: handleSubmit,
      }}
      secondaryAction={{ label: "Cancelar", onClick: handleClose }}
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <div
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <FormInput
          label="Nombre"
          name="quick-first-name"
          id="quick-first-name"
          className="min-h-11"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Ej. Lucía"
        />
        <FormInput
          label="Apellidos"
          name="quick-last-name"
          id="quick-last-name"
          className="min-h-11"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Ej. García Pérez"
        />
        <FormSelect
          label="Equipo (opcional)"
          name="quick-team"
          id="quick-team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          options={teamOptions}
        />
      </div>
    </ClothingBottomSheet>
  );
}
