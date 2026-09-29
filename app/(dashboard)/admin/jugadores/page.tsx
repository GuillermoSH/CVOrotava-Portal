import { PlayersPageClient } from "@/components/roster/PlayersPageClient";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { parsePlayerListSearchParams } from "@/lib/roster/player-filters";
import { getRosterSnapshot } from "@/lib/roster/snapshots";
import { formatSeasonShort } from "@/lib/season";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await requireRosterReadAccess();
  const [{ players, teams, season }, params] = await Promise.all([
    getRosterSnapshot(),
    searchParams,
  ]);
  const canWrite = role === "admin" || role === "manager";
  const canDelete = role === "admin";
  const initialFilters = parsePlayerListSearchParams(params, teams);

  return (
    <PlayersPageClient
      players={players}
      teams={teams}
      canWrite={canWrite}
      canDelete={canDelete}
      initialFilters={initialFilters}
      subtitle={`Plantilla ${formatSeasonShort(season)}. Equipo principal, trámites y contacto familiar.`}
    />
  );
}
