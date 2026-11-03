import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PlayerClothingSection } from "@/components/clothing/PlayerClothingSection";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { PlayerForm } from "@/components/roster/PlayerForm";
import { PlayerNeighborNav } from "@/components/roster/PlayerNeighborNav";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { Bone } from "@/components/shared/skeletons";
import {
  buildStorageTree,
  enrichInventory,
  enrichPlayerClothing,
} from "@/lib/clothing/snapshots";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getCachedPaidMatriculaIds } from "@/lib/payments/cached-payments";
import { getExemption } from "@/lib/payments/repository/exemptions";
import {
  findPlayerNeighbors,
  parsePlayerListUrlState,
  playerDetailHref,
  playerFilterStateToListFilters,
  playersListHref,
} from "@/lib/roster/player-filters";
import { getPlayerDetailsSnapshot, getPlayerNavigationItems } from "@/lib/roster/snapshots";
import { getCurrentSeason } from "@/lib/season";
import { createServiceRoleClient } from "@/lib/supabase/service-role";


/** Ropa del jugador, inventario y árbol de almacén: pesan más que la ficha, así que streamean. */
async function PlayerClothingLoader({
  playerId,
  canWrite,
}: {
  playerId: string;
  canWrite: boolean;
}) {
  const [clothing, lots, storageTree] = await Promise.all([
    enrichPlayerClothing(playerId),
    enrichInventory(),
    buildStorageTree(),
  ]);

  return (
    <PlayerClothingSection
      possession={clothing.possession}
      history={clothing.history}
      lots={lots}
      storageTree={storageTree}
      canWrite={canWrite}
    />
  );
}

function ClothingSectionFallback() {
  return (
    <section className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando ropa">
      <Bone className="h-6 w-40 rounded-md" />
      <Bone className="h-32 w-full rounded-lg" />
    </section>
  );
}

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

  const exemptionSeason = snapshot.player.season ?? getCurrentSeason();
  // Solo lo que la cabecera de la ficha necesita antes de pintar; la ropa va aparte (Suspense).
  const [navItems, exemption] = await Promise.all([
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
    // Los entrenadores no ven nada económico.
    canWrite
      ? getExemption(createServiceRoleClient(), id, exemptionSeason)
      : Promise.resolve(null),
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
    <DashboardPage>
      <div className="flex flex-col gap-8">
        <PlayerForm
          teams={snapshot.teams}
          player={snapshot.player}
          canWrite={canWrite}
          canDelete={canDelete}
          listHref={listHref}
          navigation={
            neighbors ? (
              <PlayerNeighborNav
                position={neighbors.position}
                total={neighbors.total}
                prev={neighborLink(neighbors.prev)}
                next={neighborLink(neighbors.next)}
              />
            ) : undefined
          }
          exemption={
            canWrite
              ? { playerId: id, season: exemptionSeason, current: exemption, canEdit: canDelete }
              : null
          }
        >
          <Suspense fallback={<ClothingSectionFallback />}>
            <PlayerClothingLoader playerId={id} canWrite={canWrite} />
          </Suspense>
        </PlayerForm>
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
