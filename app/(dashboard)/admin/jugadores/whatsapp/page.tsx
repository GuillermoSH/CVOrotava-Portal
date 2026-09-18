import { PlayersWhatsAppPageClient } from "@/components/roster/PlayersWhatsAppPageClient";
import { appRoutes } from "@/lib/constants";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getRosterSnapshot } from "@/lib/roster/snapshots";
import { formatSeasonShort } from "@/lib/season";

export default async function PlayersWhatsAppPage() {
  await requireRosterReadAccess();
  const { players, teams, season } = await getRosterSnapshot();

  return (
    <PlayersWhatsAppPageClient
      players={players}
      teams={teams}
      subtitle={`Plantilla ${formatSeasonShort(season)}. Teléfonos del contacto primario para crear grupos.`}
      backHref={appRoutes.players.list}
    />
  );
}
