import { OrderForm } from "@/components/clothing/OrderForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireClothingWriteAccess } from "@/lib/clothing/auth";
import { getProductsSnapshot } from "@/lib/clothing/snapshots";
import { appRoutes } from "@/lib/constants";

export default async function NewClothingOrderPage() {
  await requireClothingWriteAccess();
  const products = await getProductsSnapshot();

  return (
    <div className="clothing-page-with-sticky flex flex-col gap-6 sm:gap-8">
      <PageHeader
        back={{ href: appRoutes.clothing.orders, label: "Pedidos" }}
        title="Nuevo pedido"
        subtitle="Crea un borrador con líneas de prenda, talla y cantidad."
      />
      <OrderForm products={products} />
    </div>
  );
}
