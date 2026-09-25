import { PlayerForm } from "@/components/roster/PlayerForm";
import { requireRosterWriteAccess } from "@/lib/roster/auth";
import { getTeamsSnapshot } from "@/lib/roster/snapshots";

export default async function NewPlayerPage() {
  await requireRosterWriteAccess();
  const teams = await getTeamsSnapshot();

  return <PlayerForm teams={teams} canWrite />;
}
