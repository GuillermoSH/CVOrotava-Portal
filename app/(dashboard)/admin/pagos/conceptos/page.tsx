import { PaymentConceptsPageClient } from "@/components/payments/PaymentConceptsPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getCachedAllPaymentConceptsSnapshot } from "@/lib/payments/cached-concepts";

async function PaymentConceptsContent() {
  await requirePaymentsWriteAccess();
  const concepts = await getCachedAllPaymentConceptsSnapshot();
  return <PaymentConceptsPageClient concepts={concepts} />;
}

export default function PaymentConceptsPage() {
  return (
    <RuntimePage kind="products">
      <PaymentConceptsContent />
    </RuntimePage>
  );
}
