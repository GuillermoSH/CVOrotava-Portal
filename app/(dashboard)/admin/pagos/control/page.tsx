import { ControlDashboard } from "@/components/payments/control/ControlDashboard";
import { ControlSubnav } from "@/components/payments/control/shared";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { loadEconomicControl } from "@/lib/payments/load";

async function ControlContent() {
  await requirePaymentsWriteAccess();
  const today = new Date();
  const { control, payments } = await loadEconomicControl(today);

  return (
    <div className="flex flex-col gap-6">
      <ControlSubnav active="overview" control={control} />
      <ControlDashboard payments={payments} control={control} currentMonth={today.getMonth() + 1} />
    </div>
  );
}

export default function EconomicControlPage() {
  return (
    <RuntimePage kind="products">
      <ControlContent />
    </RuntimePage>
  );
}
