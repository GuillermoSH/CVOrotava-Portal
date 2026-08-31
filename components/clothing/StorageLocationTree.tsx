"use client";

import {
  Archive,
  Box,
  ChevronDown,
  ChevronRight,
  Layers,
  MapPin,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/club/Button";
import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import {
  createStorageLocation,
  deleteStorageLocation,
} from "@/lib/actions/clothing/locations";
import { getCurrentSeason } from "@/lib/season";
import { LOCATION_TYPE_LABELS } from "@/lib/clothing/constants";
import type { ClothingLocationType, ClothingStorageLocationNode } from "@/lib/types/db";
import { cn } from "@/lib/utils";

function childTypeFor(parentType: ClothingLocationType | null): ClothingLocationType | null {
  if (parentType === null) return "cabinet";
  if (parentType === "cabinet") return "shelf";
  if (parentType === "shelf") return "box";
  return null;
}

const TYPE_ICONS = {
  cabinet: Archive,
  shelf: Layers,
  box: Box,
} as const;

type AddFormState = {
  parentId: string | null;
  parentSeason: string;
  locationType: ClothingLocationType;
  parentLabel?: string;
};

type DeleteState = {
  id: string;
  label: string;
};

function typeBadgeClass(type: ClothingLocationType): string {
  if (type === "cabinet") {
    return "bg-[color-mix(in_srgb,var(--club-brand)_14%,transparent)] text-[var(--club-brand)]";
  }
  if (type === "shelf") {
    return "bg-[var(--club-surface-2)] text-muted-foreground";
  }
  return "bg-[color-mix(in_srgb,var(--club-fg)_6%,transparent)] text-muted-foreground";
}

function LocationNode({
  node,
  depth,
  onAddChild,
  onDelete,
}: {
  node: ClothingStorageLocationNode;
  depth: number;
  onAddChild: (state: AddFormState) => void;
  onDelete: (state: DeleteState) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const childType = childTypeFor(node.location_type);
  const hasChildren = node.children.length > 0;
  const Icon = TYPE_ICONS[node.location_type];
  const isTopLevel = depth === 0;

  function toggleExpanded() {
    if (hasChildren) setExpanded((v) => !v);
  }

  const labelBlock = (
    <>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          typeBadgeClass(node.location_type),
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
          {LOCATION_TYPE_LABELS[node.location_type]}
        </p>
        <p className="truncate font-medium text-foreground">
          {node.label}{" "}
          <span className="font-normal text-muted-foreground">({node.code})</span>
        </p>
      </div>
      {hasChildren ? (
        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
      ) : null}
    </>
  );

  return (
    <div
      className={cn(
        depth > 0 &&
          "ml-3 border-l border-[color-mix(in_srgb,var(--club-border)_70%,transparent)] sm:ml-4",
      )}
    >
      <div
        className={cn(
          "group flex min-h-11 items-center gap-1",
          isTopLevel ? "px-3 py-2 sm:px-4" : "py-1.5 pr-3 pl-2 sm:pr-4 sm:pl-3",
          depth === 1 && "sm:pl-4",
          depth === 2 && "sm:pl-5",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={toggleExpanded}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left",
              "transition-colors active:bg-[var(--club-surface-2)]",
              "hover:bg-[var(--club-surface-2)]/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--club-brand)_35%,transparent)]",
            )}
            aria-expanded={expanded}
            aria-label={expanded ? `Contraer ${node.label}` : `Expandir ${node.label}`}
          >
            {labelBlock}
          </button>
        ) : (
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2">{labelBlock}</div>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground",
            "transition-colors hover:bg-[var(--club-surface-2)] hover:text-foreground",
            "active:bg-[var(--club-surface-2)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--club-brand)_35%,transparent)]",
          )}
          aria-label={`Acciones de ${node.label}`}
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      <ClothingBottomSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={node.label}
        description={LOCATION_TYPE_LABELS[node.location_type]}
      >
        <div className="flex flex-col gap-2">
          {childType ? (
            <Button
              type="button"
              variant="secondary"
              className="btn-primary--block min-h-11 justify-start"
              onClick={() => {
                setMenuOpen(false);
                onAddChild({
                  parentId: node.id,
                  parentSeason: node.season,
                  locationType: childType,
                  parentLabel: node.label,
                });
              }}
            >
              <Plus className="size-4" aria-hidden />
              Añadir {LOCATION_TYPE_LABELS[childType].toLowerCase()}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            className="btn-primary--block min-h-11 justify-start"
            onClick={() => {
              setMenuOpen(false);
              onDelete({ id: node.id, label: node.label });
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Eliminar
          </Button>
        </div>
      </ClothingBottomSheet>

      {expanded && hasChildren ? (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <LocationNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyLocationsState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--club-border)] px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--club-surface-2)]">
        <MapPin className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <p className="font-medium text-foreground">Sin ubicaciones</p>
        <p className="text-sm text-muted-foreground">
          Crea un armario para organizar baldas y cajas de almacén.
        </p>
      </div>
      <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={onAdd}>
        <Plus className="size-4" aria-hidden />
        Nuevo armario
      </Button>
    </div>
  );
}

export function StorageLocationTree({ tree }: { tree: ClothingStorageLocationNode[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addForm, setAddForm] = useState<AddFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");

  function resetForm() {
    setLabel("");
    setCode("");
    setAddForm(null);
  }

  function openAddForm(state: AddFormState) {
    setLabel("");
    setCode("");
    setAddForm(state);
  }

  function openNewCabinet() {
    openAddForm({
      parentId: null,
      parentSeason: getCurrentSeason(),
      locationType: "cabinet",
    });
  }

  function handleAdd(e?: React.FormEvent) {
    e?.preventDefault();
    if (!addForm) return;

    startTransition(async () => {
      const result = await createStorageLocation({
        parent_id: addForm.parentId,
        location_type: addForm.locationType,
        label,
        code,
        season: addForm.parentSeason,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${LOCATION_TYPE_LABELS[addForm.locationType]} creada`);
      resetForm();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteStorageLocation(deleteTarget.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ubicación eliminada");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const addTitle = addForm
    ? addForm.parentId
      ? `Nueva ${LOCATION_TYPE_LABELS[addForm.locationType].toLowerCase()}`
      : "Nuevo armario"
    : "";

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-foreground">Árbol de ubicaciones</h2>
            <p className="text-xs text-muted-foreground">
              Armario → Balda → Caja
            </p>
          </div>
          {tree.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full sm:w-auto"
              onClick={openNewCabinet}
            >
              <Plus className="size-4" aria-hidden />
              Nuevo armario
            </Button>
          ) : null}
        </div>

        {tree.length === 0 ? (
          <EmptyLocationsState onAdd={openNewCabinet} />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--club-border)] bg-[var(--club-surface)]">
            {tree.map((node, index) => (
              <div
                key={node.id}
                className={cn(index > 0 && "border-t border-[var(--club-border)]")}
              >
                <LocationNode
                  node={node}
                  depth={0}
                  onAddChild={openAddForm}
                  onDelete={setDeleteTarget}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <ClothingBottomSheet
        open={addForm !== null}
        onClose={resetForm}
        title={addTitle}
        description={
          addForm?.parentLabel ? `Bajo «${addForm.parentLabel}»` : undefined
        }
        primaryAction={{
          label: addForm?.parentId ? "Crear" : "Crear armario",
          pending,
          onClick: () => handleAdd(),
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: resetForm,
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-label">Etiqueta</Label>
            <Input
              id="add-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                addForm
                  ? `Ej. ${LOCATION_TYPE_LABELS[addForm.locationType]} 1`
                  : "Armario A"
              }
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-code">Código</Label>
            <Input
              id="add-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ARM-A"
              required
            />
          </div>
        </div>
      </ClothingBottomSheet>

      <ClothingBottomSheet
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar ubicación"
        description={deleteTarget ? `¿Eliminar «${deleteTarget.label}»?` : undefined}
        primaryAction={{
          label: "Eliminar",
          variant: "destructive",
          pending,
          onClick: handleDelete,
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: () => setDeleteTarget(null),
        }}
      />
    </>
  );
}
