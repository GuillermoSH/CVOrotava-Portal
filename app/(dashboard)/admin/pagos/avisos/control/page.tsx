import { RemindersControl } from "@/components/payments/RemindersControl";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { buildReminderControl } from "@/lib/payments/reminders/control";

// Consultar a Resend por muchos correos puede tardar: se deja el máximo del plan.
export const maxDuration = 60;

async function ControlContent() {
  await requirePaymentsWriteAccess();
  return <RemindersControl control={await buildReminderControl()} />;
}

export default function RemindersControlPage() {
  return (
    <RuntimePage kind="products">
      <ControlContent />
    </RuntimePage>
  );
}
