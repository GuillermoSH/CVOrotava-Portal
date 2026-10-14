import { PlayersPageClient } from "@/components/roster/PlayersPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { getCachedPaidMatriculaIds } from "@/lib/payments/cached-payments";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import {
  parsePlayerListUrlState,
  playerFilterStateToListFilters,
} from "@/lib/roster/player-filters";
import { getPlayersListSnapshot, getTeamsSnapshot } from "@/lib/roster/snapshots";
import { formatSeasonShort, getCurrentSeason } from "@/lib/season";

async function PlayersContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await requireRosterReadAccess();
  const canWrite = role === "admin" || role === "manager";
  const canDelete = role === "admin";
  const season = getCurrentSeason();
  const params = await searchParams;
  const [teams, matriculaPaidPlayerIds] = await Promise.all([
    getTeamsSnapshot(season),
    canWrite ? getCachedPaidMatriculaIds(season) : Promise.resolve<string[]>([]),
  ]);
  const urlState = parsePlayerListUrlState(params, teams);
  const listFilters = playerFilterStateToListFilters(urlState);

  const { players, total, page, pageSize, inactiveCount } = await getPlayersListSnapshot({
    season,
    page: urlState.page,
    pageSize: urlState.pageSize,
    sortDir: urlState.sortDir,
    filters: listFilters,
    context: {
      matriculaPaidPlayerIds: new Set(matriculaPaidPlayerIds),
    },
  });

  return (
    <PlayersPageClient
      players={players}
      total={total}
      page={page}
      pageSize={pageSize}
      sortDir={urlState.sortDir}
      teams={teams}
      inactiveCount={inactiveCount}
      canWrite={canWrite}
      canDelete={canDelete}
      initialFilters={urlState}
      subtitle={`Plantilla ${formatSeasonShort(season)}. Equipo principal, trámites y contacto familiar.`}
      matriculaPaidPlayerIds={matriculaPaidPlayerIds}
    />
  );
}

export default function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <RuntimePage kind="players">
      <PlayersContent searchParams={searchParams} />
    </RuntimePage>
  );
}
