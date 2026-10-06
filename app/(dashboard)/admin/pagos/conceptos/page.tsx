import { PaymentConceptsPageClient } from "@/components/payments/PaymentConceptsPageClient";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getCachedAllPaymentConceptsSnapshot } from "@/lib/payments/cached-concepts";

export default async function PaymentConceptsPage() {
  await requirePaymentsWriteAccess();

  const concepts = await getCachedAllPaymentConceptsSnapshot();

  return <PaymentConceptsPageClient concepts={concepts} />;
}
