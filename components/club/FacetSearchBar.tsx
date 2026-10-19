"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { searchIncludes } from "@/lib/text/search";
import { cn } from "@/lib/utils";

export type FacetChip = {
  key: string;
  value: string;
  label: string;
};

export type FacetFieldOption = {
  value: string;
  label: string;
  count?: number;
};

export type FacetField = {
  key: string;
  label: string;
  options: FacetFieldOption[];
};

type FacetSearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  /** Valores elegidos; un mismo grupo (`key`) puede tener varios («o»). */
  facets: FacetChip[];
  fields: FacetField[];
  /** Marca o desmarca un valor. */
  onToggleFacet: (facet: FacetChip) => void;
  /** Quita todos los valores de un grupo. */
  onRemoveGroup: (key: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
};

/** Con más opciones que esto, el popover muestra su propio buscador. */
const OPTION_SEARCH_THRESHOLD = 8;

function CountPill({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded-md bg-[var(--club-surface-2)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--club-fg-muted)]">
      {count}
    </span>
  );
}

function OptionRow({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "flex w-full min-h-10 cursor-pointer touch-manipulation items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--club-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        checked && "bg-[var(--club-brand-soft)]",
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded border",
          checked
            ? "border-brand bg-brand text-primary-foreground"
            : "border-[var(--club-border)]",
        )}
        aria-hidden
      >
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm text-foreground",
          checked ? "font-semibold" : "font-medium",
        )}
      >
        {label}
      </span>
      {count !== undefined ? <CountPill count={count} /> : null}
    </button>
  );
}

function FilterPill({
  field,
  selected,
  open,
  onOpenChange,
  onToggle,
  onClearGroup,
}: {
  field: FacetField;
  selected: FacetChip[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (option: FacetFieldOption) => void;
  onClearGroup: () => void;
}) {
  const popoverId = useId();
  const [optionQuery, setOptionQuery] = useState("");
  const active = selected.length > 0;
  const showSearch = field.options.length > OPTION_SEARCH_THRESHOLD;
  const visible = field.options.filter((opt) => searchIncludes(opt.label, optionQuery));

  const summary =
    selected.length === 0
      ? field.label
      : selected.length === 1
        ? `${field.label}: ${selected[0].label}`
        : `${field.label}: ${selected[0].label} +${selected.length - 1}`;

  return (
    <div className="static sm:relative">
      <div
        className={cn(
          "inline-flex min-h-9 max-w-full items-center rounded-full border text-xs font-semibold transition-colors",
          active
            ? "border-[color-mix(in_srgb,var(--club-brand)_35%,transparent)] bg-[var(--club-brand-soft)] text-brand"
            : "border-[var(--club-border)] bg-[var(--club-surface-2)] text-foreground hover:bg-[var(--club-surface-hover)]",
          open && "ring-2 ring-[color-mix(in_srgb,var(--club-brand)_22%,transparent)]",
        )}
      >
        <button
          type="button"
          onClick={() => {
            setOptionQuery("");
            onOpenChange(!open);
          }}
          aria-expanded={open}
          aria-controls={popoverId}
          className={cn(
            "inline-flex min-h-9 min-w-0 cursor-pointer touch-manipulation items-center gap-1.5 rounded-full pl-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active ? "pr-1.5" : "pr-2.5",
          )}
        >
          <span className="truncate">{summary}</span>
          {active ? null : <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />}
        </button>
        {active ? (
          <button
            type="button"
            onClick={onClearGroup}
            aria-label={`Quitar filtro ${field.label}`}
            className="mr-1 inline-flex size-7 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--club-brand)_16%,transparent)]"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={popoverId}
          className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-border bg-[var(--club-drawer-bg)] shadow-[var(--club-shadow-card)] sm:right-auto sm:w-72"
        >
          {showSearch ? (
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                autoFocus
                type="search"
                value={optionQuery}
                onChange={(e) => setOptionQuery(e.target.value)}
                placeholder={`Buscar ${field.label.toLowerCase()}…`}
                aria-label={`Buscar en ${field.label}`}
                autoComplete="off"
                className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : null}
          <div role="group" aria-label={field.label} className="max-h-64 overflow-y-auto p-1.5">
            {visible.length === 0 ? (
              <p className="px-2.5 py-3 text-sm text-[var(--club-fg-muted)]">Sin resultados</p>
            ) : (
              visible.map((option) => (
                <OptionRow
                  key={option.value}
                  label={option.label}
                  count={option.count}
                  checked={selected.some((f) => f.value === option.value)}
                  onToggle={() => onToggle(option)}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FacetSearchBar({
  query,
  onQueryChange,
  facets,
  fields,
  onToggleFacet,
  onRemoveGroup,
  onClear,
  placeholder = "Buscar…",
  className,
}: FacetSearchBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const hasFilters = query.trim().length > 0 || facets.length > 0;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenKey(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenKey(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative flex w-full flex-col gap-2", className)}>
      <div className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-[var(--club-surface-2)] px-3 transition-colors focus-within:border-[color-mix(in_srgb,var(--club-brand)_40%,transparent)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--club-brand)_18%,transparent)]">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpenKey(null)}
          placeholder={placeholder}
          aria-label="Buscar jugadores"
          autoComplete="off"
          className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {fields.map((field) => (
          <FilterPill
            key={field.key}
            field={field}
            selected={facets.filter((f) => f.key === field.key)}
            open={openKey === field.key}
            onOpenChange={(next) => setOpenKey(next ? field.key : null)}
            onToggle={(option) =>
              onToggleFacet({ key: field.key, value: option.value, label: option.label })
            }
            onClearGroup={() => onRemoveGroup(field.key)}
          />
        ))}
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              onClear();
              setOpenKey(null);
            }}
            className="inline-flex min-h-9 cursor-pointer touch-manipulation items-center rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--club-surface-hover)] hover:text-foreground"
          >
            Limpiar todo
          </button>
        ) : null}
      </div>
    </div>
  );
}
