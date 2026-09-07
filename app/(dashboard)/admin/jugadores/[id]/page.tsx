import { notFound } from "next/navigation";

import { PlayerForm } from "@/components/roster/PlayerForm";
import { PlayerStatusActions } from "@/components/roster/PlayerStatusActions";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getPlayerDetailsSnapshot } from "@/lib/roster/snapshots";
import { formatPlayerName } from "@/lib/roster/constants";
import { appRoutes } from "@/lib/constants";

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
    <div className="clothing-page-with-sticky flex flex-col gap-6">
      <PageHeader
        back={{ href: appRoutes.players.list, label: "Jugadores" }}
        title={formatPlayerName(snapshot.player)}
        subtitle={snapshot.player.team?.name ?? "Sin equipo"}
        actions={canWrite ? <PlayerStatusActions player={snapshot.player} /> : undefined}
      />
      <PlayerForm teams={snapshot.teams} player={snapshot.player} canWrite={canWrite} />
    </div>
  );
}
