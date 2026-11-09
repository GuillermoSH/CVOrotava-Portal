import { OverdueList } from "@/components/payments/control/OverdueList";
import { ControlSubnav } from "@/components/payments/control/shared";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { loadEconomicControl } from "@/lib/payments/load";

async function OverdueContent() {
  await requirePaymentsWriteAccess();
  const { control } = await loadEconomicControl(new Date());

  return (
    <div className="flex flex-col gap-6">
      <ControlSubnav active="overdue" control={control} />
      <OverdueList control={control} />
    </div>
  );
}

export default function OverduePage() {
  return (
    <RuntimePage kind="control-overdue">
      <OverdueContent />
    </RuntimePage>
  );
}
