"use client";

import { Camera, Download, ImagePlus, Loader2, Trash2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/club/Button";
import { PlayerPhotoCropSheet } from "@/components/roster/PlayerPhotoCropSheet";
import {
  confirmPlayerPhoto,
  createPlayerPhotoUploadUrl,
  removePlayerPhoto,
} from "@/lib/actions/roster/player-photo";
import { loadImageElement } from "@/lib/roster/compress-player-photo";
import {
  PLAYER_PHOTOS_BUCKET,
  playerPhotoRoute,
} from "@/lib/roster/player-photo";
import { createClient } from "@/lib/supabase/client";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type PlayerPhotoSectionProps = {
  playerId: string;
  hasPhoto: boolean;
  playerName?: string;
  /** Tras confirmar subida: el checklist «Foto hecha» puede haberse marcado solo. */
  onPhotoConfirmed?: (photoTaken: boolean) => void;
  onPhotoRemoved?: () => void;
};

export function PlayerPhotoSection({
  playerId,
  hasPhoto: initialHasPhoto,
  playerName,
  onPhotoConfirmed,
  onPhotoRemoved,
}: PlayerPhotoSectionProps) {
  const router = useRouter();
  const previewTitleId = useId();
  const [pending, startTransition] = useTransition();
  const [hasPhoto, setHasPhoto] = useState(initialHasPhoto);
  const [uploading, setUploading] = useState(false);
  const [openingCrop, setOpeningCrop] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [cacheKey, setCacheKey] = useState(0);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null);
  const cropObjectUrlRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasPhoto(initialHasPhoto);
  }, [initialHasPhoto]);

  function revokeCropObjectUrl() {
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
  }

  useEffect(() => {
    return () => revokeCropObjectUrl();
  }, []);

  useEffect(() => {
    if (!viewerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewerOpen(false);
        setViewerLoading(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [viewerOpen]);

  const previewSrc = hasPhoto
    ? `${playerPhotoRoute(playerId, { inline: true })}&v=${cacheKey}`
    : null;

  useEffect(() => {
    if (previewSrc) setPreviewLoading(true);
    else setPreviewLoading(false);
  }, [previewSrc]);

  const busy = pending || uploading || openingCrop;
  const showLoader = busy || (Boolean(previewSrc) && previewLoading);
  const statusLabel = uploading
    ? "Guardando foto…"
    : openingCrop
      ? "Preparando recorte…"
      : pending
        ? "Actualizando…"
        : previewLoading
          ? "Cargando foto…"
          : undefined;

  async function openCropForFile(file: File | undefined) {
    if (!file) return;
    setOpeningCrop(true);
    try {
      const loaded = await loadImageElement(file);
      revokeCropObjectUrl();
      cropObjectUrlRef.current = loaded.objectUrl;
      setCropImage(loaded.image);
      setCropOpen(true);
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : "No se pudo leer la imagen");
    } finally {
      setOpeningCrop(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  function closeCrop() {
    if (uploading) return;
    setCropOpen(false);
    setCropImage(null);
    revokeCropObjectUrl();
  }

  async function uploadCroppedBlob(blob: Blob) {
    setCropOpen(false);
    setCropImage(null);
    revokeCropObjectUrl();
    setUploading(true);
    try {
      const upload = await createPlayerPhotoUploadUrl(playerId);
      if (!upload.ok) {
        appToast.error(upload.error);
        return;
      }

      const supabase = createClient();
      const contentType = blob.type || "image/webp";
      const { error: putError } = await supabase.storage
        .from(PLAYER_PHOTOS_BUCKET)
        .uploadToSignedUrl(upload.path, upload.token, blob, {
          contentType,
          upsert: true,
        });

      if (putError) {
        appToast.error(putError.message || "No se pudo subir la foto");
        return;
      }

      const confirmed = await confirmPlayerPhoto(playerId);
      if (!confirmed.ok) {
        appToast.error(confirmed.error);
        return;
      }

      setHasPhoto(true);
      setCacheKey((k) => k + 1);
      onPhotoConfirmed?.(confirmed.photo_taken ?? true);
      appToast.success("Foto guardada");
      router.refresh();
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : "No se pudo guardar la foto");
    } finally {
      setUploading(false);
    }
  }

  function openViewer() {
    if (busy || !previewSrc) return;
    setViewerLoading(true);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
    setViewerLoading(false);
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removePlayerPhoto(playerId);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      setHasPhoto(false);
      setCacheKey((k) => k + 1);
      setPreviewLoading(false);
      closeViewer();
      onPhotoRemoved?.();
      appToast.success("Foto eliminada");
      router.refresh();
    });
  }

  const viewer =
    viewerOpen && previewSrc && typeof document !== "undefined"
      ? createPortal(
          <div className="club-confirm-root z-[80]">
            <button
              type="button"
              className="club-confirm-backdrop"
              aria-label="Cerrar preview"
              onClick={closeViewer}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={previewTitleId}
              className="relative z-10 flex max-h-[min(92dvh,40rem)] w-[min(100%-1.5rem,24rem)] flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2 px-0.5">
                <h2
                  id={previewTitleId}
                  className="min-w-0 truncate text-base font-semibold text-[var(--club-drawer-bg)] drop-shadow"
                >
                  {playerName?.trim() || "Foto de ficha"}
                </h2>
                <button
                  type="button"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--club-drawer-bg)] text-foreground shadow"
                  onClick={closeViewer}
                  aria-label="Cerrar"
                >
                  <X className="size-5" strokeWidth={2} />
                </button>
              </div>
              <div
                className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--club-border)] bg-[var(--club-drawer-bg)] shadow-[var(--club-shadow-card)]"
                aria-busy={viewerLoading || undefined}
              >
                {viewerLoading ? (
                  <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--club-drawer-bg)]"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2
                      className="size-8 animate-spin text-foreground"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="text-xs font-medium text-muted-foreground">Cargando foto…</span>
                  </div>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element -- auth route */}
                <img
                  src={previewSrc}
                  alt={playerName ? `Foto de ${playerName}` : "Foto de ficha del jugador"}
                  className={cn(
                    "aspect-square w-full object-cover transition-opacity duration-300",
                    viewerLoading ? "opacity-0" : "opacity-100",
                  )}
                  onLoad={() => setViewerLoading(false)}
                  onError={() => setViewerLoading(false)}
                  ref={(el) => {
                    // Caché del navegador: onLoad puede no dispararse otra vez.
                    if (el?.complete && el.naturalWidth > 0) {
                      queueMicrotask(() => setViewerLoading(false));
                    }
                  }}
                />
              </div>
              <p className="text-center text-xs text-[var(--club-drawer-bg)]/85">
                Toca fuera o cierra para volver
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <section className="flex flex-col gap-3 border-t border-[var(--club-border)] pt-5 md:gap-2.5 md:pt-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--club-surface-2)] text-muted-foreground"
        >
          <Camera className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">Foto de ficha</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Para reconocer al jugador. Independiente de «Autoriza fotos».
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        {previewSrc ? (
          <button
            type="button"
            disabled={busy && !hasPhoto}
            onClick={openViewer}
            className={cn(
              "relative flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--club-border)] bg-[var(--club-surface-2)] sm:size-36",
              "aspect-square touch-manipulation transition-[box-shadow,transform] active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !busy && "hover:ring-2 hover:ring-[color-mix(in_srgb,var(--club-brand)_35%,transparent)]",
            )}
            aria-busy={showLoader || undefined}
            aria-label="Ver foto a tamaño grande"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- route auth */}
            <img
              src={previewSrc}
              alt=""
              className={cn(
                "size-full object-cover transition-opacity duration-200",
                previewLoading || uploading ? "opacity-40" : "opacity-100",
              )}
              onLoad={() => setPreviewLoading(false)}
              onError={() => setPreviewLoading(false)}
            />
            {showLoader ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[color-mix(in_srgb,var(--club-surface-2)_55%,transparent)]"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="size-6 animate-spin text-foreground" strokeWidth={2} aria-hidden />
                {statusLabel ? (
                  <span className="px-2 text-center text-[11px] font-medium leading-tight text-foreground">
                    {statusLabel}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,color-mix(in_srgb,var(--club-fg)_55%,transparent))] px-2 py-1.5 text-center text-[10px] font-semibold text-[var(--club-drawer-bg)]">
                Tocar para ver
              </span>
            )}
          </button>
        ) : (
          <div
            className={cn(
              "relative flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--club-border)] bg-[var(--club-surface-2)] sm:size-36",
              "aspect-square",
            )}
            aria-busy={showLoader || undefined}
          >
            <UserRound
              className={cn(
                "size-10 text-muted-foreground transition-opacity",
                showLoader ? "opacity-30" : "opacity-100",
              )}
              strokeWidth={1.5}
              aria-hidden
            />
            {showLoader ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[color-mix(in_srgb,var(--club-surface-2)_55%,transparent)]"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="size-6 animate-spin text-foreground" strokeWidth={2} aria-hidden />
                {statusLabel ? (
                  <span className="px-2 text-center text-[11px] font-medium leading-tight text-foreground">
                    {statusLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {openingCrop ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-3.5" aria-hidden />
              )}
              {hasPhoto ? "Cambiar" : "Subir"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="size-3.5" aria-hidden />
              Cámara
            </Button>
            {hasPhoto ? (
              <>
                <a
                  href={playerPhotoRoute(playerId)}
                  className={cn(
                    "btn-secondary btn-sm inline-flex items-center gap-1.5",
                    busy && "pointer-events-none opacity-60",
                  )}
                  download
                  aria-disabled={busy || undefined}
                  onClick={(e) => {
                    if (busy) e.preventDefault();
                  }}
                >
                  <Download className="size-3.5" aria-hidden />
                  Descargar
                </a>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={handleRemove}
                >
                  {pending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden />
                  )}
                  Quitar
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void openCropForFile(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void openCropForFile(e.target.files?.[0])}
      />

      <PlayerPhotoCropSheet
        open={cropOpen}
        image={cropImage}
        onClose={closeCrop}
        onConfirm={uploadCroppedBlob}
        onError={(message) => appToast.error(message)}
      />

      {viewer}
    </section>
  );
}
