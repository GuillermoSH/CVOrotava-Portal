"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  FileSpreadsheet,
  Upload,
  Users,
  UserX,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/club/Button";
import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import {
  importFederationChunkAction,
  previewFederationImportAction,
  type FederationImportPreview,
} from "@/lib/actions/roster/federation-import";
import { FEDERATION_IMPORT_CHUNK_SIZE } from "@/lib/roster/federation-import-types";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type SheetPhase = "idle" | "preview" | "importing" | "done";

type DoneSummary = {
  created: number;
  teamsCreated: number;
  incompleteCount: number;
};

type ImportProgress = {
  processed: number;
  total: number;
};

function groupDiscardedByReason(
  discarded: FederationImportPreview["discarded"],
): { reason: string; items: FederationImportPreview["discarded"] }[] {
  const map = new Map<string, FederationImportPreview["discarded"]>();
  for (const item of discarded) {
    const list = map.get(item.reason) ?? [];
    list.push(item);
    map.set(item.reason, list);
  }
  return [...map.entries()].map(([reason, items]) => ({ reason, items }));
}

function StatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "muted" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3",
        tone === "warning" &&
          "border-[color-mix(in_srgb,var(--club-warning)_45%,var(--club-border))] bg-[var(--club-warning-muted)]",
        tone === "success" &&
          "border-[color-mix(in_srgb,var(--club-success)_40%,var(--club-border))] bg-[var(--club-success-muted)]",
        tone === "muted" && "border-[var(--club-border)] bg-[var(--club-surface-2)]",
        tone === "default" && "border-[var(--club-border)] bg-[var(--club-surface)]",
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function FederationImportReview({
  preview,
  phase,
  pending,
  ackIncomplete,
  needsAck,
  incompleteCount,
  confirmDisabled,
  done,
  progress,
  onAckChange,
  onBack,
  onConfirm,
  onClose,
}: {
  preview: FederationImportPreview;
  phase: "preview" | "importing" | "done";
  pending: boolean;
  ackIncomplete: boolean;
  needsAck: boolean;
  incompleteCount: number;
  confirmDisabled: boolean;
  done: DoneSummary | null;
  progress: ImportProgress | null;
  onAckChange: (value: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const progressPct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;
  const [mounted, setMounted] = useState(false);
  const discardedGroups = useMemo(
    () => groupDiscardedByReason(preview.discarded),
    [preview.discarded],
  );

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && phase !== "importing") {
        if (phase === "done") onClose();
        else onBack();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, onBack, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="federation-import-review" role="dialog" aria-modal="true" aria-labelledby="federation-review-title">
      <header className="federation-import-review__header">
        <div className="mx-auto flex w-full max-w-6xl items-start gap-3 px-4 py-3 sm:px-6">
          {phase === "done" ? (
            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--club-surface-hover)] hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="size-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={onBack}
              disabled={pending || phase === "importing"}
              className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--club-surface-hover)] hover:text-foreground disabled:opacity-50"
              aria-label="Volver"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="federation-review-title" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {phase === "done" ? "Importación completada" : "Revisión del CSV"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {phase === "done"
                ? "Revisa las fichas incompletas en el listado de jugadores."
                : "Confirma equipos nuevos, descartados y lo que queda pendiente de rellenar."}
            </p>
          </div>
        </div>
      </header>

      <div className="federation-import-review__body">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6">
          {phase === "done" && done ? (
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--club-success)_40%,var(--club-border))] bg-[var(--club-success-muted)] px-4 py-4 sm:px-5">
              <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                <CheckCircle2 className="size-5 text-success" aria-hidden />
                Listo
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-foreground">
                <li>
                  {done.created === 1 ? "1 jugador creado" : `${done.created} jugadores creados`}
                </li>
                {done.teamsCreated > 0 ? (
                  <li>
                    {done.teamsCreated === 1
                      ? "1 equipo nuevo"
                      : `${done.teamsCreated} equipos nuevos`}
                  </li>
                ) : null}
                {done.incompleteCount > 0 ? (
                  <li className="font-medium text-[var(--club-warning-strong)]">
                    {done.incompleteCount === 1
                      ? "1 ficha incompleta pendiente en el listado"
                      : `${done.incompleteCount} fichas incompletas pendientes en el listado`}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {phase === "importing" && progress ? (
            <div className="federation-import-progress" role="status" aria-live="polite">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">Importando jugadores</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {progress.processed} de {progress.total}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-foreground">{progressPct}%</p>
              </div>
              <div
                className="federation-import-progress__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.processed}
                aria-label="Progreso de importación"
              >
                <div
                  className="federation-import-progress__fill"
                  style={{
                    transform: `scaleX(${progressPct / 100})`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3", phase === "importing" && "opacity-60")}>
            <StatPill label="Se importan" value={preview.counts.toImport} tone="success" />
            <StatPill label="Pendientes" value={preview.counts.incomplete} tone="warning" />
            <StatPill label="Descartados" value={preview.counts.discarded} tone="muted" />
            <StatPill label="Equipos nuevos" value={preview.counts.teamsToCreate} />
          </div>

          <p className="rounded-xl border border-[var(--club-border)] bg-[var(--club-surface)] px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {preview.counts.toImport === 1
                ? "1 jugador"
                : `${preview.counts.toImport} jugadores`}
            </span>{" "}
            de esta temporada se darán de alta
            {preview.counts.incomplete > 0
              ? ` · ${preview.counts.incomplete} con ficha incompleta (completar después)`
              : null}
            .
          </p>

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <section className="flex min-h-0 flex-col rounded-2xl border border-[color-mix(in_srgb,var(--club-warning)_45%,var(--club-border))] bg-[var(--club-warning-muted)]">
              <div className="border-b border-[color-mix(in_srgb,var(--club-warning)_30%,var(--club-border))] px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-[var(--club-warning-strong)]" aria-hidden />
                  <h3 className="text-base font-semibold text-foreground">
                    Pendiente de rellenar
                    <span className="ml-2 tabular-nums text-muted-foreground">
                      ({preview.counts.incomplete})
                    </span>
                  </h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Se importan igual; domicilio o contacto no confiables del CSV.
                </p>
              </div>
              <div className="max-h-[min(52dvh,28rem)] overflow-y-auto px-4 py-3 sm:px-5">
                {preview.incomplete.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Ninguna ficha incompleta
                  </p>
                ) : (
                  <ul className="divide-y divide-[color-mix(in_srgb,var(--club-warning)_22%,var(--club-border))]">
                    {preview.incomplete.map((item, index) => (
                      <li key={`inc-${item.dni}-${index}`} className="py-3 first:pt-0 last:pb-0">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.dni}
                          {item.teamName ? ` · ${item.teamName}` : null}
                        </p>
                        {item.missingFields.length > 0 ? (
                          <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                            <span className="text-muted-foreground">Falta: </span>
                            {item.missingFields.join(", ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <div className="flex flex-col gap-5">
              <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--club-border)] bg-[var(--club-surface)]">
                <div className="border-b border-[var(--club-border)] px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-2">
                    <UserX className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <h3 className="text-base font-semibold text-foreground">
                      Descartados
                      <span className="ml-2 tabular-nums text-muted-foreground">
                        ({preview.counts.discarded})
                      </span>
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No entran en esta importación.
                  </p>
                </div>
                <div className="max-h-[min(36dvh,18rem)] overflow-y-auto px-4 py-3 sm:px-5">
                  {discardedGroups.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Ningún descartado</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {discardedGroups.map((group) => (
                        <div key={group.reason}>
                          <p className="text-xs font-semibold uppercase tracking-[0.03em] text-muted-foreground">
                            {group.reason}
                            <span className="ml-1.5 tabular-nums">({group.items.length})</span>
                          </p>
                          <ul className="mt-2 flex flex-col gap-2">
                            {group.items.map((item, index) => (
                              <li
                                key={`disc-${item.dni ?? item.label}-${index}`}
                                className="text-sm text-foreground"
                              >
                                <span className="font-medium">{item.label}</span>
                                {item.dni ? (
                                  <span className="text-muted-foreground"> · {item.dni}</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--club-border)] bg-[var(--club-surface)]">
                <div className="border-b border-[var(--club-border)] px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <h3 className="text-base font-semibold text-foreground">
                      Equipos que se crearán
                      <span className="ml-2 tabular-nums text-muted-foreground">
                        ({preview.counts.teamsToCreate})
                      </span>
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Categoría base por sexo. Luego podrás repartir en A/B/C.
                  </p>
                </div>
                <div className="px-4 py-3 sm:px-5">
                  {preview.teamsToCreate.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Todos los equipos base ya existen
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {preview.teamsToCreate.map((name) => (
                        <li
                          key={name}
                          className="rounded-full border border-[var(--club-border)] bg-[var(--club-surface-2)] px-3 py-1.5 text-sm font-medium text-foreground"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <footer className="federation-import-review__footer">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {phase === "done" ? (
            <div className="flex w-full justify-end">
              <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
                Ir al listado
              </Button>
            </div>
          ) : (
            <>
              {needsAck ? (
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 sm:items-center">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 rounded border-[var(--club-border)] accent-brand sm:mt-0"
                    checked={ackIncomplete}
                    disabled={pending || phase === "importing"}
                    onChange={(event) => onAckChange(event.target.checked)}
                  />
                  <span className="text-sm text-foreground">
                    <span className="font-medium">
                      He revisado las {incompleteCount} ficha
                      {incompleteCount === 1 ? "" : "s"} incompleta
                      {incompleteCount === 1 ? "" : "s"}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground sm:mt-0 sm:inline sm:before:content-['·_']">
                      Se completan después en cada ficha
                    </span>
                  </span>
                </label>
              ) : (
                <p className="text-sm text-muted-foreground">Todas las fichas vienen completas.</p>
              )}
              <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 flex-1 sm:flex-none"
                  disabled={pending || phase === "importing"}
                  onClick={onBack}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  className="min-h-11 flex-1 sm:min-w-[11rem] sm:flex-none"
                  disabled={confirmDisabled || pending || phase === "importing"}
                  onClick={onConfirm}
                >
                  {phase === "importing" || pending ? "Importando…" : "Confirmar importación"}
                </Button>
              </div>
            </>
          )}
        </div>
      </footer>
    </div>,
    document.body,
  );
}

export function PlayersFederationImportSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<SheetPhase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FederationImportPreview | null>(null);
  const [ackIncomplete, setAckIncomplete] = useState(false);
  const [done, setDone] = useState<DoneSummary | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);

  const incompleteCount = preview?.counts.incomplete ?? 0;
  const needsAck = incompleteCount > 0;
  const confirmDisabled = !preview || preview.counts.toImport === 0 || (needsAck && !ackIncomplete);
  const reviewPhase =
    phase === "preview" || phase === "importing" || phase === "done" ? phase : null;
  const showReview = Boolean(preview) && reviewPhase !== null;

  function reset() {
    setPhase("idle");
    setFile(null);
    setPreview(null);
    setAckIncomplete(false);
    setDone(null);
    setProgress(null);
    setDragActive(false);
    dragDepth.current = 0;
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function setChosenFile(next: File | null) {
    setFile(next);
    setPreview(null);
    setAckIncomplete(false);
    setDone(null);
    setProgress(null);
    setDragActive(false);
    dragDepth.current = 0;
    setPhase("idle");
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragActive(false);
    const next = event.dataTransfer.files[0];
    if (next) setChosenFile(next);
  }

  function handlePreview() {
    if (!file) {
      appToast.error("Elige el CSV de licencias de la Federación");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await previewFederationImportAction(formData);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      setPreview({
        toImport: result.toImport,
        discarded: result.discarded,
        incomplete: result.incomplete,
        teamsToCreate: result.teamsToCreate,
        counts: result.counts,
      });
      setAckIncomplete(false);
      setProgress(null);
      setPhase("preview");
    });
  }

  function handleConfirm() {
    if (!file || !preview || confirmDisabled) return;
    const total = preview.counts.toImport;
    const ack = needsAck && ackIncomplete;
    setPhase("importing");
    setProgress({ processed: 0, total });

    // Fuera de startTransition: si no, React aplaza setProgress hasta acabar el bucle.
    void (async () => {
      let offset = 0;
      let created = 0;
      let teamsCreated = 0;
      let incomplete = preview.counts.incomplete;
      let guard = 0;

      while (guard < 200) {
        guard += 1;
        const formData = new FormData();
        formData.append("file", file);
        if (ack) {
          formData.append("acknowledge_incomplete", "1");
        }
        formData.append("offset", String(offset));
        formData.append("limit", String(FEDERATION_IMPORT_CHUNK_SIZE));

        const result = await importFederationChunkAction(formData);
        if (!result.ok) {
          setPhase("preview");
          setProgress(null);
          appToast.error(result.error);
          return;
        }

        created += result.created;
        teamsCreated += result.teamsCreated;
        incomplete = result.incompleteCount;
        offset = result.nextOffset;
        setProgress({ processed: result.processed, total: result.total });
        // Ceder un frame para que la barra pinte entre lotes.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });

        if (result.done) break;
      }

      if (created === 0) {
        setPhase("preview");
        setProgress(null);
        appToast.error("No se importó ningún jugador");
        return;
      }

      setDone({
        created,
        teamsCreated,
        incompleteCount: incomplete,
      });
      setPhase("done");
      setProgress(null);
      appToast.success(created === 1 ? "1 jugador importado" : `${created} jugadores importados`);
      router.refresh();
    })();
  }

  function handleBackFromReview() {
    if (pending || phase === "importing") return;
    setPhase("idle");
    setAckIncomplete(false);
    setProgress(null);
  }

  return (
    <>
      <ClothingBottomSheet
        open={open && !showReview}
        onClose={handleClose}
        title="Importar federación"
        description="Sube el CSV de licencias de la Federación Canaria. No sustituye al Excel del club."
        primaryAction={{
          label: pending ? "Preparando…" : file ? "Vista previa" : "Elegir CSV",
          onClick: file ? handlePreview : () => inputRef.current?.click(),
          disabled: pending,
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: handleClose,
        }}
      >
        <div className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              setChosenFile(event.target.files?.[0] ?? null);
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn("federation-dropzone", dragActive && "federation-dropzone--active")}
            aria-label={dragActive ? "Suelta el archivo CSV" : "Elegir o soltar archivo CSV"}
          >
            <Upload className="federation-dropzone__icon size-5" aria-hidden />
            <span className="text-sm font-medium text-foreground">
              {dragActive
                ? "Suelta aquí el CSV"
                : file
                  ? file.name
                  : "Suelta aquí el CSV o elige un archivo"}
            </span>
            <span className="text-xs text-muted-foreground">
              {dragActive ? "Soltar para cargar" : "Export Federación Canaria · .csv UTF-8"}
            </span>
          </button>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Solo tipo Jugador de la temporada actual. Los DNI ya dados de alta se descartan.
          </p>
        </div>
      </ClothingBottomSheet>

      {open && preview && reviewPhase ? (
        <FederationImportReview
          preview={preview}
          phase={reviewPhase}
          pending={pending}
          ackIncomplete={ackIncomplete}
          needsAck={needsAck}
          incompleteCount={incompleteCount}
          confirmDisabled={confirmDisabled}
          done={done}
          progress={progress}
          onAckChange={setAckIncomplete}
          onBack={handleBackFromReview}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      ) : null}
    </>
  );
}
