import { OrderForm } from "@/components/clothing/OrderForm";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getProductsSnapshot } from "@/lib/clothing/snapshots";

async function NewClothingOrderContent() {
  await requireClothingWriteAccess();
  const products = await getProductsSnapshot();
  return <OrderForm products={products} />;
}

export default function NewClothingOrderPage() {
  return (
    <RuntimePage kind="order-form">
      <NewClothingOrderContent />
    </RuntimePage>
  );
}
