import { OrdersPageClient } from "@/components/clothing/OrdersPageClient";
import { requireClothingReadAccess } from "@/lib/clothing/auth";
import { enrichOrders } from "@/lib/clothing/snapshots";

export default async function ClothingOrdersPage() {
  await requireClothingReadAccess();
  const orders = await enrichOrders();

  return <OrdersPageClient orders={orders} />;
}
