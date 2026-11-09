import { UnassignedAdmin } from "@/components/payments/control/UnassignedAdmin";
import { ControlSubnav } from "@/components/payments/control/shared";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { loadEconomicControl, loadPaymentDetailMap } from "@/lib/payments/load";

async function UnassignedContent() {
  await requirePaymentsWriteAccess();
  const { control } = await loadEconomicControl(new Date());
  const details = await loadPaymentDetailMap(control.unassigned.map((e) => e.payment.id));

  return (
    <div className="flex flex-col gap-6">
      <ControlSubnav active="unassigned" control={control} />
      <UnassignedAdmin control={control} details={details} />
    </div>
  );
}

export default function UnassignedPage() {
  return (
    <RuntimePage kind="products">
      <UnassignedContent />
    </RuntimePage>
  );
}
