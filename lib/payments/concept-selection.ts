import { OTHER_CONCEPT_VALUE } from "@/lib/payments/constants";
import type { PaymentConcept } from "@/lib/types/db";

/**
 * Concepto por defecto al abrir el formulario de un jugador: si hay varios
 * predefinidos con el mismo texto (p.ej. "Cuota mensual" a 25 € y 30 €), se
 * elige el importe alto o bajo según players.pays_extended_monthly; si no,
 * se prioriza el marcado como matrícula y, en su defecto, el primero activo.
 */
export function pickDefaultConceptId(
  concepts: PaymentConcept[],
  player: { pays_extended_monthly: boolean },
): string {
  if (concepts.length === 0) return OTHER_CONCEPT_VALUE;

  const byText = new Map<string, PaymentConcept[]>();
  for (const concept of concepts) {
    const list = byText.get(concept.concept) ?? [];
    list.push(concept);
    byText.set(concept.concept, list);
  }
  for (const list of byText.values()) {
    if (list.length >= 2) {
      const sorted = [...list].sort((a, b) => a.amount - b.amount);
      const pick = player.pays_extended_monthly ? sorted[sorted.length - 1] : sorted[0];
      return pick.id;
    }
  }

  const matricula = concepts.find((c) => c.is_matricula);
  return (matricula ?? concepts[0]).id;
}
