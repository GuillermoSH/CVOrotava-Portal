import { notFound } from "next/navigation";

import { PlayerClothingSection } from "@/components/clothing/PlayerClothingSection";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { PlayerForm } from "@/components/roster/PlayerForm";
import { RuntimePage } from "@/components/shared/RuntimePage";
import {
  buildStorageTree,
  enrichInventory,
  enrichPlayerClothing,
} from "@/lib/clothing/snapshots";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { parsePlayerListSearchParams, playersListHref } from "@/lib/roster/player-filters";
import { getPlayerDetailsSnapshot } from "@/lib/roster/snapshots";
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
  const listHref = playersListHref(parsePlayerListSearchParams(sp, snapshot.teams));
  const [clothing, lots, storageTree] = await Promise.all([
    enrichPlayerClothing(id),
    enrichInventory(),
    buildStorageTree(),
  ]);

  return (
    <DashboardPage
      title={formatPlayerName(snapshot.player)}
      subtitle={snapshot.player.team?.name ?? "Sin equipo"}
      back={{ href: listHref, label: "Jugadores" }}
      actions={null}
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
