import { PlayersPaymentsPageClient } from "@/components/payments/PlayersPaymentsPageClient";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { listPaymentConcepts } from "@/lib/payments/repository/concepts";
import { listPlayerIdsWithPaidMatricula } from "@/lib/payments/repository/payments";
import { getRosterSnapshot } from "@/lib/roster/snapshots";

export default async function PaymentsPage() {
  await requirePaymentsWriteAccess();

  const [{ players, season }, db] = await Promise.all([getRosterSnapshot(), getPaymentsDb()]);
  const [matriculaPaidPlayerIds, paymentConcepts] = await Promise.all([
    listPlayerIdsWithPaidMatricula(db, season),
    listPaymentConcepts(db),
  ]);

  return (
    <PlayersPaymentsPageClient
      players={players}
      season={season}
      matriculaPaidPlayerIds={[...matriculaPaidPlayerIds]}
      paymentConcepts={paymentConcepts}
    />
  );
}
