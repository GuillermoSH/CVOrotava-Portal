import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { paymentConceptsTag } from "@/lib/cache/tags";
import { listPaymentConcepts } from "@/lib/payments/repository/concepts";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { PaymentConcept } from "@/lib/types/db";

/**
 * Conceptos activos (formulario de pagos). Cacheado sin cookies; auth fuera.
 */
export async function getCachedActivePaymentConceptsSnapshot(): Promise<PaymentConcept[]> {
  "use cache";
  cacheTag(paymentConceptsTag());
  cacheLife("hours");

  const db = createServiceRoleClient();
  return listPaymentConcepts(db, { activeOnly: true });
}

/**
 * Catálogo completo de conceptos (admin). Cacheado sin cookies; auth fuera.
 */
export async function getCachedAllPaymentConceptsSnapshot(): Promise<PaymentConcept[]> {
  "use cache";
  cacheTag(paymentConceptsTag());
  cacheLife("hours");

  const db = createServiceRoleClient();
  return listPaymentConcepts(db, { activeOnly: false });
}
