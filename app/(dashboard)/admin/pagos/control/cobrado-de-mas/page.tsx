import { OverpaidAdmin } from "@/components/payments/control/OverpaidAdmin";
import { ControlSubnav } from "@/components/payments/control/shared";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { loadEconomicControl, loadPaymentDetailMap } from "@/lib/payments/load";

async function OverpaidContent() {
  await requirePaymentsWriteAccess();
  const { control } = await loadEconomicControl(new Date());
  const details = await loadPaymentDetailMap(control.overpaid.flatMap((e) => e.payments.map((p) => p.id)));

  return (
    <div className="flex flex-col gap-6">
      <ControlSubnav active="overpaid" control={control} />
      <OverpaidAdmin control={control} details={details} />
    </div>
  );
}

export default function OverpaidPage() {
  return (
    <RuntimePage kind="products">
      <OverpaidContent />
    </RuntimePage>
  );
}
