import Link from "next/link";

import { PlayersPageClient } from "@/components/roster/PlayersPageClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getRosterSnapshot } from "@/lib/roster/snapshots";
import { appRoutes } from "@/lib/constants";
import { formatSeasonShort } from "@/lib/season";

export default async function PlayersPage() {
  const role = await requireRosterReadAccess();
  const { players, teams, season } = await getRosterSnapshot();
  const canWrite = role === "admin" || role === "manager";

  return (
    <div className="clothing-page-with-sticky flex flex-col gap-6">
      <PageHeader
        title="Jugadores"
        subtitle={`Plantilla ${formatSeasonShort(season)}. Equipo principal, trámites y contacto familiar.`}
        actions={
          canWrite ? (
            <Link href={appRoutes.players.new} className="btn-primary hidden min-h-11 md:inline-flex">
              Nuevo jugador
            </Link>
          ) : undefined
        }
      />
      <PlayersPageClient players={players} teams={teams} canWrite={canWrite} />
    </div>
  );
}
