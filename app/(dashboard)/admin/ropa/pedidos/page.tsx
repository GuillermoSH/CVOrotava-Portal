import { OrdersPageClient } from "@/components/clothing/OrdersPageClient";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { enrichOrders } from "@/lib/clothing/snapshots";

export default async function ClothingOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireClothingReadAccess();
  const [{ q }, orders] = await Promise.all([searchParams, enrichOrders()]);

  return <OrdersPageClient orders={orders} initialQuery={q?.trim() ?? ""} />;
}
