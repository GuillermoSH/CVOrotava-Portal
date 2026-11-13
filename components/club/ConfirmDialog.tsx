"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/club/Button";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  pending = false,
  destructive = false,
  requireText,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
  /** Confirmación fuerte: hay que escribir este texto exacto para poder confirmar. */
  requireText?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const textMatches = !requireText || typed.trim() === requireText;

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pending]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="club-confirm-root">
      <button
        type="button"
        className="club-confirm-backdrop"
        aria-label={cancelLabel}
        disabled={pending}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="club-confirm-panel"
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        {requireText ? (
          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm text-muted-foreground">
              Escribe <strong className="font-semibold text-foreground">{requireText}</strong> para
              confirmar
            </label>
            <input
              id={inputId}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              className="form-input min-h-11"
              value={typed}
              disabled={pending}
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 sm:min-w-[7rem]"
            disabled={pending}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "primary"}
            className={cn("min-h-11 sm:min-w-[7rem]", pending && "opacity-80")}
            disabled={pending || !textMatches}
            onClick={onConfirm}
          >
            {pending ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
