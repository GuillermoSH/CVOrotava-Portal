import { PlayerForm } from "@/components/roster/PlayerForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireRosterWriteAccess } from "@/lib/roster/auth";
import { getTeamsSnapshot } from "@/lib/roster/snapshots";
import { appRoutes } from "@/lib/constants";

export default async function NewPlayerPage() {
  await requireRosterWriteAccess();
  const teams = await getTeamsSnapshot();

  return (
    <div className="clothing-page-with-sticky flex flex-col gap-6">
      <PageHeader
        back={{ href: appRoutes.players.list, label: "Jugadores" }}
        title="Nuevo jugador"
        subtitle="Ficha de la temporada. El equipo es el principal; las convocatorias a otras categorías no se anotan aquí."
      />
      <PlayerForm teams={teams} canWrite />
    </div>
  );
}
