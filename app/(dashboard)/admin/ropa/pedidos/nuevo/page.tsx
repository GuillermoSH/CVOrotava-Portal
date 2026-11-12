import { OrderForm } from "@/components/clothing/OrderForm";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getProductsSnapshot, getRosterSnapshot } from "@/lib/clothing/snapshots";

async function NewClothingOrderContent() {
  await requireClothingWriteAccess();
  const [products, players] = await Promise.all([getProductsSnapshot(), getRosterSnapshot()]);
  return <OrderForm products={products} players={players} />;
}

export default function NewClothingOrderPage() {
  return (
    <RuntimePage kind="order-form">
      <NewClothingOrderContent />
    </RuntimePage>
  );
}
