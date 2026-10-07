import { OrdersPageClient } from "@/components/clothing/OrdersPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { enrichOrders } from "@/lib/clothing/snapshots";

async function ClothingOrdersContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireClothingReadAccess();
  const [{ q }, orders] = await Promise.all([searchParams, enrichOrders()]);
  return <OrdersPageClient orders={orders} initialQuery={q?.trim() ?? ""} />;
}

export default function ClothingOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <RuntimePage kind="orders">
      <ClothingOrdersContent searchParams={searchParams} />
    </RuntimePage>
  );
}
