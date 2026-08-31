"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/club/Button";
import { cn } from "@/lib/utils";

const DISMISS_MS = 320;
const DRAG_CLOSE_PX = 72;

export function ClothingBottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    pending?: boolean;
    variant?: "primary" | "destructive";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const [present, setPresent] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
  }, [open]);

  useEffect(() => {
    if (!visible && present) {
      const timer = window.setTimeout(() => setPresent(false), DISMISS_MS);
      return () => window.clearTimeout(timer);
    }
  }, [visible, present]);

  useEffect(() => {
    if (!present) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [present]);

  useEffect(() => {
    if (!present) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [present, onClose]);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [open]);

  const isMobileSheet = useCallback(() => {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  }, []);

  function onDragPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!isMobileSheet()) return;
    event.preventDefault();
    dragStartY.current = event.clientY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onDragPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setDragY(Math.max(0, event.clientY - dragStartY.current));
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const sheetHeight = sheetRef.current?.offsetHeight ?? 320;
    if (dragY >= DRAG_CLOSE_PX || dragY > sheetHeight * 0.22) {
      setDragY(0);
      onClose();
      return;
    }

    setDragY(0);
  }

  if (!present || typeof document === "undefined") return null;

  const sheetStyle =
    dragY > 0 || isDragging
      ? ({ transform: `translateY(${dragY}px)` } as const)
      : undefined;

  return createPortal(
    <div
      className={cn("clothing-sheet-root", visible && "clothing-sheet-root--visible")}
      role="presentation"
    >
      <button
        type="button"
        className="clothing-sheet-backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={cn(
          "clothing-bottom-sheet",
          isDragging && "clothing-bottom-sheet--dragging",
        )}
        style={sheetStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clothing-sheet-title"
      >
        <div
          className="clothing-sheet-drag-zone md:hidden"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div className="clothing-sheet-handle" aria-hidden />
        </div>

        <div className="clothing-sheet-body">
          <h2 id="clothing-sheet-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
          {(primaryAction || secondaryAction) && (
            <div className="mt-6 flex flex-col gap-2">
              {primaryAction ? (
                <Button
                  type="button"
                  variant={primaryAction.variant === "destructive" ? "destructive" : "primary"}
                  className="btn-primary--block min-h-11"
                  disabled={primaryAction.disabled || primaryAction.pending}
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.pending ? "Guardando…" : primaryAction.label}
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="btn-primary--block min-h-11"
                  disabled={secondaryAction.disabled}
                  onClick={secondaryAction.onClick}
                >
                  {secondaryAction.label}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ClothingSheetOption({
  selected,
  onSelect,
  children,
  className,
}: {
  selected?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "clothing-sheet-option",
        selected && "clothing-sheet-option--selected",
        className,
      )}
    >
      {children}
    </button>
  );
}
