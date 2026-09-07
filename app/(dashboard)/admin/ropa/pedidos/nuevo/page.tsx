import { OrderForm } from "@/components/clothing/OrderForm";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getProductsSnapshot } from "@/lib/clothing/snapshots";

export default async function NewClothingOrderPage() {
  await requireClothingWriteAccess();
  const products = await getProductsSnapshot();

  return <OrderForm products={products} />;
}
