"use client";

import Link from "next/link";

import { DashboardPage } from "@/components/layout/DashboardPage";
import {
  useWhatsAppFilters,
  WhatsAppEntryList,
  WhatsAppFilterFields,
} from "@/components/roster/PlayersWhatsAppList";
import type { PlayerListItem, Team } from "@/lib/types/db";

export function PlayersWhatsAppPageClient({
  players,
  teams,
  subtitle,
  backHref,
  canWrite = false,
}: {
  players: PlayerListItem[];
  teams: Team[];
  subtitle: string;
  backHref: string;
  canWrite?: boolean;
}) {
  const filters = useWhatsAppFilters(players, teams, filtersInitialCategory(players));

  return (
    <DashboardPage
      title="Teléfonos WhatsApp"
      subtitle={subtitle}
      actions={
        <Link href={backHref} className="btn-secondary hidden md:inline-flex">
          Volver a jugadores
        </Link>
      }
    >
      <div className="flex max-w-xl flex-col gap-5">
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

        <Link href={backHref} className="btn-secondary min-h-11 md:hidden">
          Volver a jugadores
        </Link>
      </div>
    </DashboardPage>
  );
}

function filtersInitialCategory(players: PlayerListItem[]): string {
  const present = new Set(
    players
      .filter((player) => player.is_active)
      .map((player) => player.team?.category)
      .filter(Boolean),
  );
  for (const player of players) {
    const category = player.team?.category;
    if (category && present.has(category)) return category;
  }
  return "";
}
