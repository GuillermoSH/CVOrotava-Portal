"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import {
  compressSquarePlayerPhoto,
  type PixelCrop,
} from "@/lib/roster/compress-player-photo";
import { cn } from "@/lib/utils";

/** Zoom 1 = fit (foto entera). */
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type PlayerPhotoCropSheetProps = {
  open: boolean;
  image: HTMLImageElement | null;
  onClose: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
  onError?: (message: string) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function maxPan(natural: number, stage: number, scale: number) {
  const drawn = natural * scale;
  return Math.max(0, (drawn - stage) / 2);
}

export function PlayerPhotoCropSheet({
  open,
  image,
  onClose,
  onConfirm,
  onError,
}: PlayerPhotoCropSheetProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  } | null>(null);

  const [stageSize, setStageSize] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [encoding, setEncoding] = useState(false);

  const naturalW = image?.naturalWidth || 0;
  const naturalH = image?.naturalHeight || 0;
  const ready = Boolean(image && naturalW > 0 && naturalH > 0 && stageSize > 0);

  const fitScale = ready ? Math.min(stageSize / naturalW, stageSize / naturalH) : 1;
  const fillScale = ready ? Math.max(stageSize / naturalW, stageSize / naturalH) : 1;
  const scale = fitScale * zoom;
  const coverZoom = ready ? fillScale / fitScale : 1;
  const atFit = zoom <= 1.02;

  const clampPan = useCallback(
    (x: number, y: number, nextZoom: number) => {
      if (!ready) return { x: 0, y: 0 };
      const nextScale = fitScale * nextZoom;
      return {
        x: clamp(x, -maxPan(naturalW, stageSize, nextScale), maxPan(naturalW, stageSize, nextScale)),
        y: clamp(y, -maxPan(naturalH, stageSize, nextScale), maxPan(naturalH, stageSize, nextScale)),
      };
    },
    [ready, fitScale, naturalW, naturalH, stageSize],
  );

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setEncoding(false);
  }, [open, image]);

  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;

    const measure = () => {
      const size = Math.floor(Math.min(el.clientWidth, el.clientHeight));
      if (size > 0) setStageSize(size);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, image]);

  useEffect(() => {
    if (!ready) return;
    setPanX((x) => clamp(x, -maxPan(naturalW, stageSize, scale), maxPan(naturalW, stageSize, scale)));
    setPanY((y) => clamp(y, -maxPan(naturalH, stageSize, scale), maxPan(naturalH, stageSize, scale)));
  }, [ready, naturalW, naturalH, stageSize, scale]);

  function computeCrop(): PixelCrop | null {
    if (!ready) return null;
    const imgLeft = stageSize / 2 - (naturalW * scale) / 2 + panX;
    const imgTop = stageSize / 2 - (naturalH * scale) / 2 + panY;
    const mapped = stageSize / scale;
    const size = Math.min(mapped, naturalW, naturalH);
    return {
      x: clamp((0 - imgLeft) / scale, 0, Math.max(0, naturalW - size)),
      y: clamp((0 - imgTop) / scale, 0, Math.max(0, naturalH - size)),
      size,
    };
  }

  async function handleConfirm() {
    if (!image || encoding) return;
    const crop = computeCrop();
    if (!crop) return;
    setEncoding(true);
    try {
      const blob = await compressSquarePlayerPhoto(image, crop);
      await onConfirm(blob);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "No se pudo procesar la imagen");
      setEncoding(false);
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!ready || encoding) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originPanX: panX,
      originPanY: panY,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampPan(
      drag.originPanX + (event.clientX - drag.startX),
      drag.originPanY + (event.clientY - drag.startY),
      zoom,
    );
    setPanX(next.x);
    setPanY(next.y);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!ready || encoding) return;
    event.preventDefault();
    const nextZoom = clamp(zoom + (event.deltaY > 0 ? -0.08 : 0.08), MIN_ZOOM, MAX_ZOOM);
    const next = clampPan(panX, panY, nextZoom);
    setZoom(nextZoom);
    setPanX(next.x);
    setPanY(next.y);
  }

  return (
    <ClothingBottomSheet
      open={open}
      onClose={() => {
        if (!encoding) onClose();
      }}
      title="Recortar foto"
      description="Empieza en ajuste (fit): ves la foto entera. El marco blanco es el único borde: todo lo de dentro se guarda en cuadrado."
      primaryAction={{
        label: "Usar foto",
        onClick: () => {
          void handleConfirm();
        },
        disabled: !ready || encoding,
        pending: encoding,
      }}
      secondaryAction={{
        label: "Cancelar",
        onClick: onClose,
        disabled: encoding,
      }}
    >
      <div className="flex flex-col gap-4">
        <div
          ref={stageRef}
          className={cn(
            "relative mx-auto aspect-square w-full max-w-[min(100%,22rem)] touch-none overflow-hidden rounded-xl",
            "border-[3px] border-[color-mix(in_srgb,var(--club-fg)_70%,var(--club-drawer-bg))]",
            "bg-[color-mix(in_srgb,var(--club-fg)_14%,var(--club-surface-2))]",
            "select-none",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
          role="img"
          aria-label="Marco de recorte: lo de dentro se guarda"
        >
          {image && ready ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL crop stage
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none origin-center"
              style={{
                width: naturalW * scale,
                height: naturalH * scale,
                transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px))`,
              }}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
              Cargando imagen…
            </div>
          )}

          <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-md bg-[color-mix(in_srgb,var(--club-bg)_88%,transparent)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-foreground">
            Zona que se guarda
          </span>
        </div>

        <label className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-muted-foreground">Zoom</span>
            <span className="tabular-nums text-muted-foreground">
              {atFit ? "Fit (foto entera)" : zoom + 0.02 >= coverZoom ? "Relleno" : "Acercando"}
            </span>
          </div>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!ready || encoding}
            onChange={(e) => {
              const nextZoom = Number(e.target.value);
              const next = clampPan(panX, panY, nextZoom);
              setZoom(nextZoom);
              setPanX(next.x);
              setPanY(next.y);
            }}
            className="w-full accent-[var(--club-brand)]"
            aria-valuemin={MIN_ZOOM}
            aria-valuemax={MAX_ZOOM}
            aria-valuenow={zoom}
          />
          <p className="text-[11px] leading-snug text-muted-foreground">
            Arrastra la foto para moverla. Las bandas grises no se guardan; solo el interior del marco.
          </p>
        </label>
      </div>
    </ClothingBottomSheet>
  );
}
