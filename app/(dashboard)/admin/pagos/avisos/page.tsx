import { RemindersPageClient } from "@/components/payments/RemindersPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getReminderConfig } from "@/lib/payments/reminders/config";
import { buildReminderPreview } from "@/lib/payments/reminders/run";

function todayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function RemindersContent() {
  await requirePaymentsWriteAccess();

  const config = getReminderConfig();
  const today = new Date();
  const initial = await buildReminderPreview({ today });

  return (
    <RemindersPageClient
      initialDate={todayKey(today)}
      initialPlans={initial.plans}
      initialOwing={initial.owing}
      instructions={config.instructions}
      status={{
        emailConfigured: config.emailConfigured,
        enabled: config.enabled,
        testTo: config.testTo,
        cronConfigured: Boolean(config.cronSecret),
      }}
    />
  );
}

export default function RemindersPage() {
  return (
    <RuntimePage kind="products">
      <RemindersContent />
    </RuntimePage>
  );
}
