import { PlayerForm } from "@/components/roster/PlayerForm";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireRosterWriteAccess } from "@/lib/roster/auth";
import { getTeamsSnapshot } from "@/lib/roster/snapshots";

async function NewPlayerContent() {
  await requireRosterWriteAccess();
  const teams = await getTeamsSnapshot();
  return <PlayerForm teams={teams} canWrite />;
}

export default function NewPlayerPage() {
  return (
    <RuntimePage kind="player-form">
      <NewPlayerContent />
    </RuntimePage>
  );
}
