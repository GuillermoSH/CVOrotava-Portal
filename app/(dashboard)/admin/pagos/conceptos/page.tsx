import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/constants";

/** Los conceptos predefinidos se sustituyeron por tarifas por temporada. */
export default function PaymentConceptsPage() {
  redirect(appRoutes.payments.fees);
}
