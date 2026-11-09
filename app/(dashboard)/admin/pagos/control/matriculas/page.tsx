import { MatriculaList } from "@/components/payments/control/MatriculaList";
import { ControlSubnav } from "@/components/payments/control/shared";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { loadEconomicControl } from "@/lib/payments/load";

async function MatriculaContent() {
  await requirePaymentsWriteAccess();
  const { control } = await loadEconomicControl(new Date());

  return (
    <div className="flex flex-col gap-6">
      <ControlSubnav active="matricula" control={control} />
      <MatriculaList control={control} />
    </div>
  );
}

export default function MatriculaPage() {
  return (
    <RuntimePage kind="control-matricula">
      <MatriculaContent />
    </RuntimePage>
  );
}
