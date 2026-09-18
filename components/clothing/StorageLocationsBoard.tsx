"use client";

import { FolderInput, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/club/DropdownMenu";
import { FormInput } from "@/components/club/forms";
import { Tooltip, TooltipGroup } from "@/components/club/Tooltip";
import { ClothingBottomSheet, ClothingSheetOption } from "@/components/clothing/ClothingBottomSheet";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { WarehouseBoxMark, WarehouseCabinetMark } from "@/components/clothing/WarehouseBoxMark";
import { WarehouseCrate } from "@/components/clothing/WarehouseCrate";
import {
  createStorageLocation,
  deleteStorageLocation,
  moveStorageLocation,
  updateStorageLocation,
} from "@/lib/actions/clothing/locations";
import { getCurrentSeason } from "@/lib/season";
import {
  buildBoxBoard,
  collectBoxHomes,
  flattenCabinets,
  flattenBoxNodes,
  suggestNextBoxCode,
  suggestNextCabinetCode,
} from "@/lib/clothing/storageBoxes";
import type { ClothingLocationType, ClothingStorageLocationNode } from "@/lib/types/db";
import { appToast } from "@/lib/toast";

type LocationFormState = {
  mode: "create" | "edit";
  id?: string;
  parentId: string | null;
  parentSeason: string;
  locationType: ClothingLocationType;
  parentLabel?: string;
};

type DeleteState = { id: string; label: string; kind: "box" | "cabinet" };
type MoveState = { id: string; label: string; code: string };

export function StorageLocationsBoard({ tree }: { tree: ClothingStorageLocationNode[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<LocationFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveState | null>(null);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [moveParentId, setMoveParentId] = useState<string | null>(null);

  const board = useMemo(() => buildBoxBoard(tree), [tree]);
  const homes = useMemo(() => collectBoxHomes(tree), [tree]);
  const cabinets = useMemo(() => flattenCabinets(tree), [tree]);
  const boxes = useMemo(() => flattenBoxNodes(tree), [tree]);
  const allNodes = useMemo(() => [...boxes, ...cabinets], [boxes, cabinets]);

  function resetForm() {
    setLabel("");
    setCode("");
    setForm(null);
  }

  function openAddBox(parentId: string | null, parentSeason: string, parentLabel?: string) {
    const nextCode = suggestNextBoxCode(allNodes);
    setCode(nextCode);
    setLabel(`Caja ${Number.parseInt(nextCode.replace(/\D/g, ""), 10) || boxes.length + 1}`);
    setForm({
      mode: "create",
      parentId,
      parentSeason,
      locationType: "box",
      parentLabel,
    });
  }

  function openAddCabinet() {
    setCode(suggestNextCabinetCode(allNodes));
    setLabel("");
    setForm({
      mode: "create",
      parentId: null,
      parentSeason: getCurrentSeason(),
      locationType: "cabinet",
    });
  }

  function openEdit(node: ClothingStorageLocationNode) {
    const parent = node.parent_id
      ? allNodes.find((item) => item.id === node.parent_id)
      : undefined;
    setCode(node.code);
    setLabel(node.label);
    setForm({
      mode: "edit",
      id: node.id,
      parentId: node.parent_id,
      parentSeason: node.season,
      locationType: node.location_type,
      parentLabel: parent?.label,
    });
  }

  function openMove(box: ClothingStorageLocationNode) {
    const home = homes.find((item) => item.box.id === box.id);
    setMoveParentId(home?.cabinet?.id ?? null);
    setMoveTarget({ id: box.id, label: box.label, code: box.code });
  }

  function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form) return;

    startTransition(async () => {
      if (form.mode === "edit" && form.id) {
        const existing = allNodes.find((node) => node.id === form.id);
        const result = await updateStorageLocation({
          id: form.id,
          parent_id: existing?.parent_id ?? form.parentId,
          location_type: form.locationType,
          label,
          code,
          season: existing?.season ?? form.parentSeason,
          notes: existing?.notes ?? undefined,
        });
        if (!result.ok) {
          appToast.error(result.error);
          return;
        }
        appToast.success(form.locationType === "box" ? "Caja actualizada" : "Armario actualizado");
        resetForm();
        router.refresh();
        return;
      }

      const result = await createStorageLocation({
        parent_id: form.parentId,
        location_type: form.locationType,
        label,
        code,
        season: form.parentSeason,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(form.locationType === "box" ? "Caja creada" : "Armario creado");
      resetForm();
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteStorageLocation(deleteTarget.id);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(deleteTarget.kind === "box" ? "Caja eliminada" : "Armario eliminado");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  function confirmMove() {
    if (!moveTarget) return;
    startTransition(async () => {
      const result = await moveStorageLocation({
        id: moveTarget.id,
        parent_id: moveParentId,
      });
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(moveParentId ? "Caja colocada en el armario" : "Caja dejada suelta");
      setMoveTarget(null);
      router.refresh();
    });
  }

  function crateFor(box: ClothingStorageLocationNode) {
    return (
      <WarehouseCrate
        key={box.id}
        code={box.code}
        label={box.label}
        actions={
          <CrateInlineActions
            label={box.label}
            showMove={cabinets.length > 0}
            onEdit={() => openEdit(box)}
            onMove={() => openMove(box)}
            onDelete={() => setDeleteTarget({ id: box.id, label: box.label, kind: "box" })}
          />
        }
      />
    );
  }

  const isEmpty = boxes.length === 0 && cabinets.length === 0;
  const formTitle = form
    ? form.mode === "edit"
      ? form.locationType === "box"
        ? "Editar caja"
        : "Editar armario"
      : form.locationType === "box"
        ? "Nueva caja"
        : "Nuevo armario"
    : "";

  return (
    <>
      <section className="clothing-page-with-sticky flex flex-col gap-5">
        {!isEmpty ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className="min-h-11 text-left text-sm font-medium text-brand md:hidden"
              onClick={openAddCabinet}
            >
              Nuevo armario
            </button>
            <div className="clothing-toolbar hidden md:flex">
              <Button type="button" variant="secondary" onClick={openAddCabinet}>
                Nuevo armario
              </Button>
              <Button type="button" onClick={() => openAddBox(null, getCurrentSeason())}>
                <Plus className="size-4" aria-hidden />
                Nueva caja
              </Button>
            </div>
          </div>
        ) : null}

        {isEmpty ? (
          <EmptyBoxesState onAdd={() => openAddBox(null, getCurrentSeason())} />
        ) : cabinets.length === 0 ? (
          <div className="warehouse-board">
            {board.loose.map((box) => crateFor(box))}
            <AddCrateButton onClick={() => openAddBox(null, getCurrentSeason())} />
          </div>
        ) : (
          <div className="flex flex-col gap-7">
            <WarehouseBay title="Cajas sueltas" count={board.loose.length}>
              {board.loose.map((box) => crateFor(box))}
              <AddCrateButton onClick={() => openAddBox(null, getCurrentSeason())} />
            </WarehouseBay>

            {board.cabinets.map(({ cabinet, boxes: cabinetBoxes }) => (
              <WarehouseBay
                key={cabinet.id}
                title={cabinet.label}
                code={cabinet.code}
                count={cabinetBoxes.length}
                menu={
                  <CabinetOverflowMenu
                    label={cabinet.label}
                    onEdit={() => openEdit(cabinet)}
                    onDelete={() =>
                      setDeleteTarget({ id: cabinet.id, label: cabinet.label, kind: "cabinet" })
                    }
                  />
                }
              >
                {cabinetBoxes.map((box) => crateFor(box))}
                <AddCrateButton
                  onClick={() => openAddBox(cabinet.id, cabinet.season, cabinet.label)}
                />
              </WarehouseBay>
            ))}
          </div>
        )}
      </section>

      <ClothingStickyActionBar
        actions={[
          {
            type: "button",
            label: "Nueva caja",
            onClick: () => openAddBox(null, getCurrentSeason()),
          },
        ]}
      />

      <ClothingBottomSheet
        open={form !== null}
        onClose={resetForm}
        title={formTitle}
        description={
          form?.mode === "edit"
            ? form.locationType === "box"
              ? "Cambia el código o el nombre. El contenido no se mueve."
              : "Cambia el código o el nombre."
            : form?.parentLabel
              ? `Dentro de «${form.parentLabel}»`
              : form?.locationType === "box"
                ? "Quedará suelta. Más adelante puedes meterla en un armario."
                : "Sirve para agrupar cajas cuando las tengas juntas."
        }
        primaryAction={{
          label:
            form?.mode === "edit"
              ? "Guardar"
              : form?.locationType === "box"
                ? "Crear caja"
                : "Crear armario",
          pending,
          onClick: () => handleSave(),
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: resetForm,
        }}
      >
        <div className="flex flex-col gap-3">
          <FormInput
            label="Código"
            name="location-code"
            id="location-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={form?.locationType === "box" ? "CAJ-01" : "ARM-A"}
            required
          />
          <FormInput
            label="Nombre"
            name="location-label"
            id="location-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={form?.locationType === "box" ? "Ej. Calentamiento" : "Armario A"}
            required
          />
        </div>
      </ClothingBottomSheet>

      <ClothingBottomSheet
        open={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        title={moveTarget ? `Mover ${moveTarget.code}` : "Mover caja"}
        description="La caja sigue identificándose igual. Solo cambia dónde está."
        primaryAction={{
          label: "Mover",
          pending,
          onClick: confirmMove,
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: () => setMoveTarget(null),
        }}
      >
        <div className="flex flex-col gap-2">
          <ClothingSheetOption
            selected={moveParentId === null}
            onSelect={() => setMoveParentId(null)}
          >
            Cajas sueltas
          </ClothingSheetOption>
          {cabinets.map((cabinet) => (
            <ClothingSheetOption
              key={cabinet.id}
              selected={moveParentId === cabinet.id}
              onSelect={() => setMoveParentId(cabinet.id)}
            >
              {cabinet.label} ({cabinet.code})
            </ClothingSheetOption>
          ))}
        </div>
      </ClothingBottomSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.kind === "cabinet" ? "Eliminar armario" : "Eliminar caja"}
        description={deleteTarget ? `¿Eliminar «${deleteTarget.label}»?` : undefined}
        confirmLabel="Eliminar"
        destructive
        pending={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function WarehouseBay({
  title,
  code,
  count,
  menu,
  children,
}: {
  title: string;
  code?: string;
  count: number;
  menu?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="warehouse-bay">
      <div className="min-w-0">
        <p className="warehouse-bay__title">
          {code ? <WarehouseCabinetMark /> : <WarehouseBoxMark size="icon" />}
          <span className="min-w-0 truncate">{title}</span>
          {code ? <span className="warehouse-bay__code">{code}</span> : null}
          {menu}
        </p>
        <p className="warehouse-bay__meta">{count === 1 ? "1 caja" : `${count} cajas`}</p>
      </div>
      <div className="warehouse-board">{children}</div>
    </section>
  );
}

function CabinetOverflowMenu({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton
        className="warehouse-crate__menu warehouse-bay__menu"
        aria-label={`Acciones de ${label}`}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" sideOffset={6} className="w-max min-w-40">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CrateInlineActions({
  label,
  showMove,
  onEdit,
  onMove,
  onDelete,
}: {
  label: string;
  showMove: boolean;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  return (
    <TooltipGroup>
      <div className="warehouse-crate__actions">
        <CrateIconAction label={`Editar ${label}`} onClick={onEdit}>
          <Pencil className="size-3.5" aria-hidden />
        </CrateIconAction>
        {showMove ? (
          <CrateIconAction label={`Mover ${label}`} onClick={onMove}>
            <FolderInput className="size-3.5" aria-hidden />
          </CrateIconAction>
        ) : null}
        <CrateIconAction label={`Eliminar ${label}`} onClick={onDelete} danger>
          <Trash2 className="size-3.5" aria-hidden />
        </CrateIconAction>
      </div>
    </TooltipGroup>
  );
}

function CrateIconAction({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={["warehouse-crate__action", danger ? "warehouse-crate__action--danger" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function AddCrateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="warehouse-crate warehouse-crate--add warehouse-crate--interactive"
    >
      <WarehouseBoxMark ghost size="sm" />
      <p className="warehouse-crate__add-label">Añadir caja</p>
    </button>
  );
}

function EmptyBoxesState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-[var(--radius-lg)] border border-dashed border-[var(--club-border)] px-6 py-12 text-center">
      <WarehouseBoxMark size="lg" />
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-medium text-foreground">Empieza por una caja</p>
        <p className="text-sm text-muted-foreground">
          El código es lo que identificarás en el almacén. El armario puede esperar.
        </p>
      </div>
      <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={onAdd}>
        <Plus className="size-4" aria-hidden />
        Nueva caja
      </Button>
    </div>
  );
}
