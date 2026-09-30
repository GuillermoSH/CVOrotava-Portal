import { PlayersPaymentsPageClient } from "@/components/payments/PlayersPaymentsPageClient";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { listPlayerIdsWithPaidMatricula } from "@/lib/payments/repository/payments";
import { getRosterSnapshot } from "@/lib/roster/snapshots";

export default async function PaymentsPage() {
  await requirePaymentsWriteAccess();

  const [{ players, season }, db] = await Promise.all([getRosterSnapshot(), getPaymentsDb()]);
  const matriculaPaidPlayerIds = await listPlayerIdsWithPaidMatricula(db, season);

  return (
    <PlayersPaymentsPageClient
      players={players}
      season={season}
      matriculaPaidPlayerIds={[...matriculaPaidPlayerIds]}
    />
  );
}
