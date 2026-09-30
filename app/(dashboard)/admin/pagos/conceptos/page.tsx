import { PaymentConceptsPageClient } from "@/components/payments/PaymentConceptsPageClient";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getPaymentsDb } from "@/lib/payments/repository/client";
import { listPaymentConcepts } from "@/lib/payments/repository/concepts";

export default async function PaymentConceptsPage() {
  await requirePaymentsWriteAccess();

  const db = await getPaymentsDb();
  const concepts = await listPaymentConcepts(db, { activeOnly: false });

  return <PaymentConceptsPageClient concepts={concepts} />;
}
