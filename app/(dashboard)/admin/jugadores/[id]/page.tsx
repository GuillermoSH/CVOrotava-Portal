import { notFound } from "next/navigation";

import { PlayerClothingSection } from "@/components/clothing/PlayerClothingSection";
import { DashboardPage } from "@/components/layout/DashboardPage";
import { PlayerForm } from "@/components/roster/PlayerForm";
import {
  buildStorageTree,
  enrichInventory,
  enrichPlayerClothing,
} from "@/lib/clothing/snapshots";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getPlayerDetailsSnapshot } from "@/lib/roster/snapshots";
import { formatPlayerName } from "@/lib/roster/constants";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const role = await requireRosterReadAccess();
  const { id } = await params;
  const snapshot = await getPlayerDetailsSnapshot(id);
  if (!snapshot) notFound();

  const canWrite = role === "admin" || role === "manager";
  const canDelete = role === "admin";
  const [clothing, lots, storageTree] = await Promise.all([
    enrichPlayerClothing(id),
    enrichInventory(),
    buildStorageTree(),
  ]);

  return (
    <DashboardPage
      title={formatPlayerName(snapshot.player)}
      subtitle={snapshot.player.team?.name ?? "Sin equipo"}
      actions={null}
    >
      <div className="flex flex-col gap-8">
        <PlayerForm
          teams={snapshot.teams}
          player={snapshot.player}
          canWrite={canWrite}
          canDelete={canDelete}
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
