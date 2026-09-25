import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/constants";

export default function LegacyClothingDeliveriesPage() {
  redirect(appRoutes.clothing.deliveries);
}
