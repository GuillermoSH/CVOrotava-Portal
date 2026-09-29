/**
 * Contrato UI ↔ actions del import CSV Federación Canaria.
 * El parser/actions reales viven en federation-import + actions; este módulo
 * fija las formas que consume `PlayersFederationImportSheet`.
 */

/** Tamaño de lote para la barra de progreso (cliente + servidor). */
export const FEDERATION_IMPORT_CHUNK_SIZE = 15;

export type FederationImportToImportItem = {
  row?: number;
  label: string;
  dni: string;
  teamName: string;
  missingFields: string[];
};

export type FederationImportDiscardedItem = {
  row?: number;
  label: string;
  dni?: string | null;
  reason: string;
};

export type FederationImportIncompleteItem = FederationImportToImportItem & {
  missingFields: string[];
};

export type FederationImportPreview = {
  toImport: FederationImportToImportItem[];
  discarded: FederationImportDiscardedItem[];
  incomplete: FederationImportIncompleteItem[];
  teamsToCreate: string[];
  counts: {
    toImport: number;
    discarded: number;
    incomplete: number;
    teamsToCreate: number;
  };
};

export type FederationImportPreviewResult =
  | ({ ok: true } & FederationImportPreview)
  | { ok: false; error: string };

export type FederationImportConfirmResult =
  | {
      ok: true;
      created: number;
      teamsCreated: number;
      incompleteCount: number;
    }
  | { ok: false; error: string };

export type FederationImportChunkResult =
  | {
      ok: true;
      created: number;
      failed: number;
      processed: number;
      total: number;
      teamsCreated: number;
      incompleteCount: number;
      /** Jugadores aún pendientes tras este lote (re-parse). */
      remainingAfter: number;
      done: boolean;
      /** @deprecated Compat; el lote siempre toma desde el inicio de pendientes. */
      nextOffset: number;
    }
  | { ok: false; error: string };
