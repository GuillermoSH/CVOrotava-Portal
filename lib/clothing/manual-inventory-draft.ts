import { CLOTHING_SIZES, type ClothingSize } from "@/lib/clothing/constants";

export const MANUAL_INVENTORY_DRAFT_KEY = "cvo.clothing.manual-inventory-draft.v2";
export const MANUAL_INVENTORY_DRAFT_VERSION = 2 as const;

/** Size group in draft: quantity of units, optional dorsals (≤ quantity). */
export type ManualInventoryDraftGroup = {
  clientId: string;
  size: ClothingSize;
  quantity: number;
  jersey_numbers: number[];
};

export type ManualInventoryDraft = {
  version: typeof MANUAL_INVENTORY_DRAFT_VERSION;
  season: string;
  product_id: string;
  groups: ManualInventoryDraftGroup[];
  updatedAt: string;
};

export type ManualInventoryDraftScope = {
  season: string;
  product_id: string;
};

/** Flat lines for createManualInventoryBatchAction. */
export type ManualInventoryBatchLine = {
  size: ClothingSize;
  quantity: number;
  jersey_number: number | null;
};

function isClothingSize(value: unknown): value is ClothingSize {
  return typeof value === "string" && (CLOTHING_SIZES as readonly string[]).includes(value);
}

function isDraftGroup(value: unknown): value is ManualInventoryDraftGroup {
  if (!value || typeof value !== "object") return false;
  const group = value as Record<string, unknown>;
  if (typeof group.clientId !== "string" || group.clientId.length === 0) return false;
  if (!isClothingSize(group.size)) return false;
  if (
    typeof group.quantity !== "number" ||
    !Number.isInteger(group.quantity) ||
    group.quantity < 1
  ) {
    return false;
  }
  if (!Array.isArray(group.jersey_numbers)) return false;
  const jerseys: number[] = [];
  for (const item of group.jersey_numbers) {
    if (typeof item !== "number" || !Number.isInteger(item) || item < 0 || item > 99) {
      return false;
    }
    jerseys.push(item);
  }
  if (new Set(jerseys).size !== jerseys.length) return false;
  if (jerseys.length > group.quantity) return false;
  return true;
}

function parseDraft(raw: string): ManualInventoryDraft | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as Record<string, unknown>;
    if (draft.version !== MANUAL_INVENTORY_DRAFT_VERSION) return null;
    if (typeof draft.season !== "string" || draft.season.length < 4) return null;
    if (typeof draft.product_id !== "string" || draft.product_id.length === 0) return null;
    if (typeof draft.updatedAt !== "string") return null;
    if (!Array.isArray(draft.groups) || !draft.groups.every(isDraftGroup)) return null;
    return {
      version: MANUAL_INVENTORY_DRAFT_VERSION,
      season: draft.season,
      product_id: draft.product_id,
      groups: draft.groups,
      updatedAt: draft.updatedAt,
    };
  } catch {
    return null;
  }
}

function matchesScope(draft: ManualInventoryDraft, scope: ManualInventoryDraftScope): boolean {
  return draft.season === scope.season && draft.product_id === scope.product_id;
}

export function expandDraftGroupsToBatchLines(
  groups: ManualInventoryDraftGroup[],
): ManualInventoryBatchLine[] {
  const lines: ManualInventoryBatchLine[] = [];
  for (const group of groups) {
    for (const jersey of group.jersey_numbers) {
      lines.push({ size: group.size, quantity: 1, jersey_number: jersey });
    }
    const remaining = group.quantity - group.jersey_numbers.length;
    if (remaining > 0) {
      lines.push({ size: group.size, quantity: remaining, jersey_number: null });
    }
  }
  return lines;
}

export function draftGroupUnits(groups: ManualInventoryDraftGroup[]): number {
  return groups.reduce((sum, group) => sum + group.quantity, 0);
}

/** Read any stored draft (for hydrate before season/product are known). */
export function readManualInventoryDraft(): ManualInventoryDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(MANUAL_INVENTORY_DRAFT_KEY);
  if (!raw) return null;
  return parseDraft(raw);
}

/** Load draft for season + product. Returns null if missing, corrupt, or scoped mismatch. */
export function loadManualInventoryDraft(
  scope: ManualInventoryDraftScope,
): ManualInventoryDraft | null {
  const draft = readManualInventoryDraft();
  if (!draft) return null;
  if (!matchesScope(draft, scope)) return null;
  return draft;
}

/** Persist versioned draft (one active product at a time). */
export function saveManualInventoryDraft(
  draft: Omit<ManualInventoryDraft, "version" | "updatedAt"> & {
    version?: typeof MANUAL_INVENTORY_DRAFT_VERSION;
    updatedAt?: string;
  },
): void {
  if (typeof window === "undefined") return;
  const payload: ManualInventoryDraft = {
    version: MANUAL_INVENTORY_DRAFT_VERSION,
    season: draft.season,
    product_id: draft.product_id,
    groups: draft.groups,
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
  };
  window.localStorage.setItem(MANUAL_INVENTORY_DRAFT_KEY, JSON.stringify(payload));
}

/**
 * Clear draft. With scope, only clears if stored draft matches season+product.
 * Without scope, always removes the key.
 */
export function clearManualInventoryDraft(scope?: ManualInventoryDraftScope): void {
  if (typeof window === "undefined") return;
  if (!scope) {
    window.localStorage.removeItem(MANUAL_INVENTORY_DRAFT_KEY);
    // Drop legacy v1 key if present.
    window.localStorage.removeItem("cvo.clothing.manual-inventory-draft.v1");
    return;
  }
  const raw = window.localStorage.getItem(MANUAL_INVENTORY_DRAFT_KEY);
  if (!raw) return;
  const draft = parseDraft(raw);
  if (!draft || matchesScope(draft, scope)) {
    window.localStorage.removeItem(MANUAL_INVENTORY_DRAFT_KEY);
  }
}
