/**
 * Checklist de alta en orden operativo:
 * 1) entregamos docs → 2) vuelven rellenos → 3) foto → 4) licencia.
 * WhatsApp va aparte (no entra en «Alta completa»).
 */
export const PLAYER_CHECKLIST_FIELDS = [
  "docs_delivered_to_family",
  "registration_papers_received",
  "photo_taken",
  "license_completed",
] as const;

export type PlayerChecklistField = (typeof PLAYER_CHECKLIST_FIELDS)[number];

/** Toggles de lista / lote: alta + WhatsApp. */
export const PLAYER_LIST_TOGGLE_FIELDS = [
  ...PLAYER_CHECKLIST_FIELDS,
  "in_whatsapp_group",
] as const;

export type PlayerListToggleField = (typeof PLAYER_LIST_TOGGLE_FIELDS)[number];

export const PLAYER_CHECKLIST_LABELS: Record<PlayerListToggleField, string> = {
  docs_delivered_to_family: "Docs",
  registration_papers_received: "Papeles",
  photo_taken: "Foto",
  license_completed: "Licencia",
  in_whatsapp_group: "WA",
};

export const PLAYER_CHECKLIST_LONG_LABELS: Record<PlayerListToggleField, string> = {
  docs_delivered_to_family: "Docs entregados",
  registration_papers_received: "Papeles recibidos",
  photo_taken: "Foto",
  license_completed: "Licencia",
  in_whatsapp_group: "En grupo WhatsApp",
};

export type PlayerOnboardingInput = {
  registration_papers_received: boolean;
  docs_delivered_to_family: boolean;
  photo_taken: boolean;
  license_completed: boolean;
  docs_delivered_at?: string | null;
};

export type PlayerOnboardingMissing = {
  field: PlayerChecklistField;
  label: string;
};

export type PlayerOnboardingStatus = {
  isComplete: boolean;
  missing: PlayerOnboardingMissing[];
  missingLabels: string[];
  summary: string;
};

export function getPlayerOnboardingStatus(player: PlayerOnboardingInput): PlayerOnboardingStatus {
  const missing: PlayerOnboardingMissing[] = PLAYER_CHECKLIST_FIELDS.filter(
    (field) => !player[field],
  ).map((field) => ({
    field,
    label: PLAYER_CHECKLIST_LABELS[field],
  }));

  const isComplete = missing.length === 0;
  const missingLabels = missing.map((item) => item.label);

  return {
    isComplete,
    missing,
    missingLabels,
    summary: isComplete
      ? "Alta completa"
      : missingLabels.length === 1
        ? `Falta ${missingLabels[0]}`
        : `Falta: ${missingLabels.join(", ")}`,
  };
}

/**
 * Fecha de entrega de docs: sirve para saber cuándo se los dimos
 * hasta que vuelven rellenos. Luego deja de mostrarse (el dato puede seguir en BD).
 */
export function isDocsDeliveryDateRelevant(player: {
  docs_delivered_to_family: boolean;
  registration_papers_received: boolean;
}): boolean {
  return player.docs_delivered_to_family && !player.registration_papers_received;
}

/** Fecha corta tipo “3 sep” para lista / ficha. */
export function formatDocsDeliveredShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/** Valor date input (YYYY-MM-DD) desde timestamptz. */
export function docsDeliveredAtToInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Timestamptz ISO desde date input; mediodía local para evitar saltos de día. */
export function docsDeliveredInputToIso(dateInput: string): string {
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`).toISOString();
  }
  return new Date().toISOString();
}

export {
  getPlayerProfileCompleteness,
  type PlayerProfileCompleteness,
  type PlayerProfileCompletenessInput,
} from "@/lib/roster/profile-completeness";

