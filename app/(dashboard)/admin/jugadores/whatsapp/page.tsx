import { PlayersWhatsAppPageClient } from "@/components/roster/PlayersWhatsAppPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { appRoutes } from "@/lib/constants";
import { requireRosterReadAccess } from "@/lib/roster/auth";
import { getRosterSnapshot } from "@/lib/roster/snapshots";
import { formatSeasonShort } from "@/lib/season";

async function PlayersWhatsAppContent() {
  const role = await requireRosterReadAccess();
  const { players, teams, season } = await getRosterSnapshot();
  const canWrite = role === "admin" || role === "manager";

  return (
    <PlayersWhatsAppPageClient
      players={players}
      teams={teams}
      canWrite={canWrite}
      subtitle={`Plantilla ${formatSeasonShort(season)}. Copia teléfonos y confirma al añadirlos al grupo.`}
      backHref={appRoutes.players.list}
    />
  );
}

export default function PlayersWhatsAppPage() {
  return (
    <RuntimePage kind="players">
      <PlayersWhatsAppContent />
    </RuntimePage>
  );
}
