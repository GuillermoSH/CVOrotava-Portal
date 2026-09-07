import Link from "next/link";

import { DashboardPage } from "@/components/layout/DashboardPage";
import { PlayersPageClient } from "@/components/roster/PlayersPageClient";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getRosterSnapshot } from "@/lib/roster/snapshots";
import { appRoutes } from "@/lib/constants";
import { formatSeasonShort } from "@/lib/season";

export default async function PlayersPage() {
  const role = await requireRosterReadAccess();
  const { players, teams, season } = await getRosterSnapshot();
  const canWrite = role === "admin" || role === "manager";

  return (
    <DashboardPage
      subtitle={`Plantilla ${formatSeasonShort(season)}. Equipo principal, trámites y contacto familiar.`}
      actions={
        canWrite ? (
          <Link href={appRoutes.players.new} className="btn-primary hidden min-h-11 md:inline-flex">
            Nuevo jugador
          </Link>
        ) : null
      }
    >
      <PlayersPageClient players={players} teams={teams} canWrite={canWrite} />
    </DashboardPage>
  );
}
