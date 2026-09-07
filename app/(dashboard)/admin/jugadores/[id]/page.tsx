import { notFound } from "next/navigation";

import { DashboardPage } from "@/components/layout/DashboardPage";
import { PlayerForm } from "@/components/roster/PlayerForm";
import { PlayerStatusActions } from "@/components/roster/PlayerStatusActions";
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

  return (
    <DashboardPage
      title={formatPlayerName(snapshot.player)}
      subtitle={snapshot.player.team?.name ?? "Sin equipo"}
      actions={canWrite ? <PlayerStatusActions player={snapshot.player} /> : null}
    >
      <PlayerForm teams={snapshot.teams} player={snapshot.player} canWrite={canWrite} />
    </DashboardPage>
  );
}
