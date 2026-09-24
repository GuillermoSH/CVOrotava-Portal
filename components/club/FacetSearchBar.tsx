"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
  /** Selecting the field applies its first/only option immediately (e.g. “Sin equipo”). */
  instant?: boolean;
};

type FacetSearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  facets: FacetChip[];
  fields: FacetField[];
  onAddFacet: (facet: FacetChip) => void;
  onRemoveFacet: (key: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
};

function optionMatchesQuery(option: FacetFieldOption, q: string): boolean {
  if (!q) return true;
  return option.label.toLowerCase().includes(q);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="presentation"
      className="sticky top-0 z-10 border-b border-border bg-[color-mix(in_srgb,var(--club-surface-2)_88%,var(--club-drawer-bg))] px-3.5 py-2"
    >
      <p className="text-[11px] font-semibold leading-none tracking-[0.04em] text-[var(--club-fg-muted)]">
        {children}
      </p>
    </div>
  );
}

function CountPill({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded-md bg-[var(--club-surface-2)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--club-fg-muted)]">
      {count}
    </span>
  );
}

export function FacetSearchBar({
  query,
  onQueryChange,
  facets,
  fields,
  onAddFacet,
  onRemoveFacet,
  onClear,
  placeholder = "Buscar o filtrar…",
  className,
}: FacetSearchBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);

  const hasFilters = query.trim().length > 0 || facets.length > 0;
  const q = query.trim().toLowerCase();
  const activeField = fields.find((f) => f.key === activeFieldKey) ?? null;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveFieldKey(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveFieldKey(null);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function addFacet(field: FacetField, option: FacetFieldOption) {
    onAddFacet({
      key: field.key,
      value: option.value,
      label: field.instant ? option.label : `${field.label}: ${option.label}`,
    });
    onQueryChange("");
    setActiveFieldKey(null);
    setOpen(false);
    inputRef.current?.blur();
  }

  function selectField(field: FacetField) {
    if (field.instant) {
      const option = field.options[0];
      if (option) addFacet(field, option);
      return;
    }
    setActiveFieldKey(field.key);
  }

  const matchingCrossField = q
    ? fields.flatMap((field) =>
        field.instant
          ? []
          : field.options
              .filter((opt) => optionMatchesQuery(opt, q))
              .map((opt) => ({ field, option: opt })),
      )
    : [];

  const visibleFields = q
    ? fields.filter(
        (field) =>
          field.label.toLowerCase().includes(q) ||
          field.options.some((opt) => optionMatchesQuery(opt, q)),
      )
    : fields;

  const fieldOptions = activeField
    ? activeField.options.filter((opt) => optionMatchesQuery(opt, q))
    : [];

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex min-h-11 w-full flex-col gap-2 rounded-xl border border-border bg-[var(--club-surface-2)] px-2.5 py-2 transition-colors",
          open &&
            "border-[color-mix(in_srgb,var(--club-brand)_40%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--club-brand)_18%,transparent)]",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {facets.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {facets.map((facet) => (
              <button
                key={`${facet.key}:${facet.value}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFacet(facet.key);
                }}
                className="inline-flex min-h-9 max-w-full cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg bg-[var(--club-brand-soft)] px-2.5 text-xs font-semibold text-brand ring-1 ring-inset ring-[color-mix(in_srgb,var(--club-brand)_28%,transparent)]"
                aria-label={`Quitar filtro ${facet.label}`}
              >
                <span className="truncate">{facet.label}</span>
                <X className="size-3.5 shrink-0 opacity-80" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setOpen(true);
              if (!e.target.value.trim()) setActiveFieldKey(null);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            aria-label="Buscar o filtrar jugadores"
            aria-expanded={open}
            aria-controls={listboxId}
            role="combobox"
            autoComplete="off"
            className="min-h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {hasFilters ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                setActiveFieldKey(null);
                setOpen(false);
              }}
              className="inline-flex min-h-9 shrink-0 cursor-pointer touch-manipulation items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--club-surface-hover)] hover:text-foreground"
            >
              Limpiar
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1.5 max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl border border-border bg-[var(--club-drawer-bg)] shadow-[var(--club-shadow-card)]"
        >
          {query.trim() ? (
            <button
              type="button"
              role="option"
              className="flex w-full min-h-12 cursor-pointer items-center gap-3 border-b border-border px-3.5 py-3 text-left transition-colors hover:bg-[var(--club-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => {
                setOpen(false);
                setActiveFieldKey(null);
                inputRef.current?.blur();
              }}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--club-brand-soft)] text-brand">
                <Search className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Buscar «{query.trim()}»
                </span>
                <span className="mt-0.5 block text-xs text-[var(--club-fg-muted)]">
                  En nombre, DNI, equipo o teléfono
                </span>
              </span>
            </button>
          ) : null}

          {activeField ? (
            <div>
              <button
                type="button"
                className="sticky top-0 z-10 flex w-full min-h-11 cursor-pointer items-center gap-2 border-b border-border bg-[color-mix(in_srgb,var(--club-brand-soft)_55%,var(--club-drawer-bg))] px-3 py-2.5 text-left transition-colors hover:bg-[var(--club-brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => setActiveFieldKey(null)}
              >
                <ChevronLeft className="size-4 shrink-0 text-brand" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium leading-none text-[var(--club-fg-muted)]">
                    Volver a filtros
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-foreground">
                    {activeField.label}
                  </span>
                </span>
              </button>

              {fieldOptions.length === 0 ? (
                <p className="px-3.5 py-4 text-sm text-[var(--club-fg-muted)]">Sin opciones</p>
              ) : (
                <ul className="py-1">
                  {fieldOptions.map((option) => (
                    <li key={option.value}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full min-h-11 cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--club-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        onClick={() => addFacet(activeField, option)}
                      >
                        <span className="text-sm font-medium text-foreground">{option.label}</span>
                        {option.count !== undefined ? <CountPill count={option.count} /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div>
              {matchingCrossField.length > 0 ? (
                <div className="border-b border-border">
                  <SectionLabel>Coincidencias</SectionLabel>
                  <ul className="py-1">
                    {matchingCrossField.slice(0, 8).map(({ field, option }) => (
                      <li key={`${field.key}:${option.value}`}>
                        <button
                          type="button"
                          role="option"
                          className="flex w-full min-h-12 cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--club-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          onClick={() => addFacet(field, option)}
                        >
                          <span className="min-w-0">
                            <span className="block text-[11px] font-medium leading-none text-[var(--club-fg-muted)]">
                              {field.label}
                            </span>
                            <span className="mt-1 block text-sm font-semibold text-foreground">
                              {option.label}
                            </span>
                          </span>
                          {option.count !== undefined ? <CountPill count={option.count} /> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <SectionLabel>Filtrar por</SectionLabel>
              {visibleFields.length === 0 ? (
                <p className="px-3.5 py-4 text-sm text-[var(--club-fg-muted)]">Sin filtros</p>
              ) : (
                <ul className="py-1">
                  {visibleFields.map((field) => (
                    <li key={field.key}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full min-h-12 cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--club-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        onClick={() => selectField(field)}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground">
                            {field.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--club-fg-muted)]">
                            {field.instant
                              ? "Aplicar filtro"
                              : `${field.options.length} ${field.options.length === 1 ? "opción" : "opciones"}`}
                          </span>
                        </span>
                        {field.instant && field.options[0]?.count !== undefined ? (
                          <CountPill count={field.options[0].count} />
                        ) : null}
                        {!field.instant ? (
                          <ChevronRight
                            className="size-4 shrink-0 text-[var(--club-fg-muted)]"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
