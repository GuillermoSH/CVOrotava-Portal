import { notFound } from "next/navigation";

import { PlayerClothingSection } from "@/components/clothing/PlayerClothingSection";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { PlayerForm } from "@/components/roster/PlayerForm";
import { PlayerNeighborNav } from "@/components/roster/PlayerNeighborNav";
import { RuntimePage } from "@/components/shared/RuntimePage";
import {
  buildStorageTree,
  enrichInventory,
  enrichPlayerClothing,
} from "@/lib/clothing/snapshots";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getCachedPaidMatriculaIds } from "@/lib/payments/cached-payments";
import {
  findPlayerNeighbors,
  parsePlayerListUrlState,
  playerDetailHref,
  playerFilterStateToListFilters,
  playersListHref,
} from "@/lib/roster/player-filters";
import { getPlayerDetailsSnapshot, getPlayerNavigationItems } from "@/lib/roster/snapshots";
import { getCurrentSeason } from "@/lib/season";
import { formatPlayerName } from "@/lib/roster/constants";

async function PlayerDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await requireRosterReadAccess();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const snapshot = await getPlayerDetailsSnapshot(id);
  if (!snapshot) notFound();

  const canWrite = role === "admin" || role === "manager";
  const canDelete = role === "admin";
  const urlState = parsePlayerListUrlState(sp, snapshot.teams);
  const paging = {
    page: urlState.page,
    pageSize: urlState.pageSize,
    sortDir: urlState.sortDir,
  };
  const listHref = playersListHref(urlState, paging);
  const listFilters = playerFilterStateToListFilters(urlState);
  const needsMatricula = listFilters.checklists?.includes("missing_matricula") ?? false;

  const [clothing, lots, storageTree, navItems] = await Promise.all([
    enrichPlayerClothing(id),
    enrichInventory(),
    buildStorageTree(),
    (async () => {
      const season = snapshot.player.season ?? getCurrentSeason();
      const matriculaPaidPlayerIds =
        needsMatricula && canWrite
          ? new Set(await getCachedPaidMatriculaIds(season))
          : undefined;
      return getPlayerNavigationItems({
        season,
        sortDir: urlState.sortDir,
        filters: listFilters,
        context: { matriculaPaidPlayerIds },
      });
    })(),
  ]);

  const neighbors = findPlayerNeighbors(navItems, id, urlState.pageSize);
  const neighborLink = (neighbor: { id: string; name: string; page: number } | null) =>
    neighbor
      ? {
          name: neighbor.name,
          href: playerDetailHref(neighbor.id, urlState, { ...paging, page: neighbor.page }),
        }
      : null;

  return (
    <DashboardPage
      title={formatPlayerName(snapshot.player)}
      subtitle={snapshot.player.team?.name ?? "Sin equipo"}
      back={{ href: listHref, label: "Jugadores" }}
      actions={
        neighbors ? (
          <PlayerNeighborNav
            position={neighbors.position}
            total={neighbors.total}
            prev={neighborLink(neighbors.prev)}
            next={neighborLink(neighbors.next)}
          />
        ) : null
      }
    >
      <div className="flex flex-col gap-8">
        <PlayerForm
          teams={snapshot.teams}
          player={snapshot.player}
          canWrite={canWrite}
          canDelete={canDelete}
          listHref={listHref}
        />
        <PlayerClothingSection
          possession={clothing.possession}
          history={clothing.history}
          lots={lots}
          storageTree={storageTree}
          canWrite={canWrite}
        />
      </div>
    </DashboardPage>
  );
}

export default function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <RuntimePage kind="player-form">
      <PlayerDetailContent params={params} searchParams={searchParams} />
    </RuntimePage>
  );
}
