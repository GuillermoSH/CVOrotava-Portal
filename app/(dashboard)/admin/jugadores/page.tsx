import { PlayersPageClient } from "@/components/roster/PlayersPageClient";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getRosterSnapshot } from "@/lib/roster/snapshots";
import { formatSeasonShort } from "@/lib/season";

export default async function PlayersPage() {
  const role = await requireRosterReadAccess();
  const { players, teams, season } = await getRosterSnapshot();
  const canWrite = role === "admin" || role === "manager";
  const canDelete = role === "admin";

  return (
    <PlayersPageClient
      players={players}
      teams={teams}
      canWrite={canWrite}
      canDelete={canDelete}
      subtitle={`Plantilla ${formatSeasonShort(season)}. Equipo principal, trámites y contacto familiar.`}
    />
  );
}
