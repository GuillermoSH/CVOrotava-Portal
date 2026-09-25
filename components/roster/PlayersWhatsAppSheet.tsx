"use client";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import {
  useWhatsAppFilters,
  WhatsAppEntryList,
  WhatsAppFilterFields,
} from "@/components/roster/PlayersWhatsAppList";
import type { PlayerListItem, Team } from "@/lib/types/db";

export function PlayersWhatsAppSheet({
  open,
  onClose,
  players,
  teams,
  canWrite = false,
}: {
  open: boolean;
  onClose: () => void;
  players: PlayerListItem[];
  teams: Team[];
  canWrite?: boolean;
}) {
  const filters = useWhatsAppFilters(players, teams);

  return (
    <ClothingBottomSheet
      open={open}
      onClose={onClose}
      title="WhatsApp"
      description="Filtra, copia y confirma quién ya está en el grupo."
      secondaryAction={{ label: "Cerrar", onClick: onClose }}
    >
      <div className="flex flex-col gap-5">
        <WhatsAppFilterFields
          category={filters.category}
          onCategoryChange={filters.setCategory}
          teamId={filters.teamId}
          onTeamIdChange={filters.setTeamId}
          onlyMissingWhatsapp={filters.onlyMissingWhatsapp}
          onOnlyMissingChange={filters.setOnlyMissingWhatsapp}
          categoryOptions={filters.categoryOptions}
          teamOptions={filters.teamOptions}
        />
        <WhatsAppEntryList
          key={`${filters.category}:${filters.teamId}:${filters.onlyMissingWhatsapp}`}
          entries={filters.entries}
          category={filters.category}
          canWrite={canWrite}
        />
      </div>
    </ClothingBottomSheet>
  );
}
