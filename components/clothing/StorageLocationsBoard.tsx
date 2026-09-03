"use client";

import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/club/Button";
import { ConfirmDialog } from "@/components/club/ConfirmDialog";
import { FormInput } from "@/components/club/forms";
import { ClothingBottomSheet, ClothingSheetOption } from "@/components/clothing/ClothingBottomSheet";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { WarehouseBoxMark, WarehouseCabinetMark } from "@/components/clothing/WarehouseBoxMark";
import { WarehouseCrate } from "@/components/clothing/WarehouseCrate";
import {
  createStorageLocation,
  deleteStorageLocation,
  moveStorageLocation,
} from "@/lib/actions/clothing/locations";
import { getCurrentSeason } from "@/lib/season";
import {
  boxHomeLabel,
  buildBoxBoard,
  collectBoxHomes,
  flattenCabinets,
  flattenBoxNodes,
  suggestNextBoxCode,
  suggestNextCabinetCode,
} from "@/lib/clothing/storageBoxes";
import type { ClothingLocationType, ClothingStorageLocationNode } from "@/lib/types/db";
import { appToast } from "@/lib/toast";

type AddFormState = {
  parentId: string | null;
  parentSeason: string;
  locationType: ClothingLocationType;
  parentLabel?: string;
};

type DeleteState = { id: string; label: string };
type MoveState = { id: string; label: string; code: string };

export function StorageLocationsBoard({ tree }: { tree: ClothingStorageLocationNode[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addForm, setAddForm] = useState<AddFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveState | null>(null);
  const [menuBoxId, setMenuBoxId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [moveParentId, setMoveParentId] = useState<string | null>(null);

  const board = useMemo(() => buildBoxBoard(tree), [tree]);
  const homes = useMemo(() => collectBoxHomes(tree), [tree]);
  const cabinets = useMemo(() => flattenCabinets(tree), [tree]);
  const boxes = useMemo(() => flattenBoxNodes(tree), [tree]);
  const allNodes = useMemo(() => [...boxes, ...cabinets], [boxes, cabinets]);

  const menuBox = homes.find((home) => home.box.id === menuBoxId) ?? null;

  function resetForm() {
    setLabel("");
    setCode("");
    setAddForm(null);
  }

  function openAddBox(parentId: string | null, parentSeason: string, parentLabel?: string) {
    const nextCode = suggestNextBoxCode(allNodes);
    setCode(nextCode);
    setLabel(`Caja ${Number.parseInt(nextCode.replace(/\D/g, ""), 10) || boxes.length + 1}`);
    setAddForm({
      parentId,
      parentSeason,
      locationType: "box",
      parentLabel,
    });
  }

  function openAddCabinet() {
    setCode(suggestNextCabinetCode(allNodes));
    setLabel("");
    setAddForm({
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
        appToast.error(result.error);
        return;
      }
      appToast.success(addForm.locationType === "box" ? "Caja creada" : "Armario creado");
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
      appToast.success("Ubicación eliminada");
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

  const isEmpty = boxes.length === 0 && cabinets.length === 0;
  const addTitle = addForm
    ? addForm.locationType === "box"
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
            <div className="hidden gap-2 md:flex">
              <Button type="button" variant="secondary" className="min-h-11" onClick={openAddCabinet}>
                Nuevo armario
              </Button>
              <Button
                type="button"
                className="min-h-11"
                onClick={() => openAddBox(null, getCurrentSeason())}
              >
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
            {board.loose.map((box) => (
              <WarehouseCrate
                key={box.id}
                code={box.code}
                label={box.label}
                menu={
                  <CrateMenuButton
                    label={box.label}
                    onClick={() => setMenuBoxId(box.id)}
                  />
                }
              />
            ))}
            <AddCrateButton onClick={() => openAddBox(null, getCurrentSeason())} />
          </div>
        ) : (
          <div className="flex flex-col gap-7">
            <WarehouseBay title="Cajas sueltas" count={board.loose.length}>
              {board.loose.map((box) => (
                <WarehouseCrate
                  key={box.id}
                  code={box.code}
                  label={box.label}
                  home="Suelta"
                  menu={
                    <CrateMenuButton
                      label={box.label}
                      onClick={() => setMenuBoxId(box.id)}
                    />
                  }
                />
              ))}
              <AddCrateButton onClick={() => openAddBox(null, getCurrentSeason())} />
            </WarehouseBay>

            {board.cabinets.map(({ cabinet, boxes: cabinetBoxes }) => (
              <WarehouseBay
                key={cabinet.id}
                title={cabinet.label}
                code={cabinet.code}
                count={cabinetBoxes.length}
                onDelete={() => setDeleteTarget({ id: cabinet.id, label: cabinet.label })}
              >
                {cabinetBoxes.map((box) => {
                  const home = homes.find((item) => item.box.id === box.id);
                  return (
                    <WarehouseCrate
                      key={box.id}
                      code={box.code}
                      label={box.label}
                      home={home ? boxHomeLabel(home) : cabinet.label}
                      menu={
                        <CrateMenuButton
                          label={box.label}
                          onClick={() => setMenuBoxId(box.id)}
                        />
                      }
                    />
                  );
                })}
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
        open={menuBox !== null}
        onClose={() => setMenuBoxId(null)}
        title={menuBox?.box.label ?? ""}
        description={menuBox ? menuBox.box.code : undefined}
      >
        <div className="flex flex-col gap-2">
          {cabinets.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="btn-primary--block min-h-11 justify-start"
              onClick={() => {
                if (!menuBox) return;
                setMoveParentId(menuBox.cabinet?.id ?? null);
                setMoveTarget({
                  id: menuBox.box.id,
                  label: menuBox.box.label,
                  code: menuBox.box.code,
                });
                setMenuBoxId(null);
              }}
            >
              {menuBox?.cabinet ? "Cambiar de armario" : "Poner en un armario"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            className="btn-primary--block min-h-11 justify-start"
            onClick={() => {
              if (!menuBox) return;
              setDeleteTarget({ id: menuBox.box.id, label: menuBox.box.label });
              setMenuBoxId(null);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Eliminar caja
          </Button>
        </div>
      </ClothingBottomSheet>

      <ClothingBottomSheet
        open={addForm !== null}
        onClose={resetForm}
        title={addTitle}
        description={
          addForm?.parentLabel
            ? `Dentro de «${addForm.parentLabel}»`
            : addForm?.locationType === "box"
              ? "Quedará suelta. Más adelante puedes meterla en un armario."
              : "Sirve para agrupar cajas cuando las tengas juntas."
        }
        primaryAction={{
          label: addForm?.locationType === "box" ? "Crear caja" : "Crear armario",
          pending,
          onClick: () => handleAdd(),
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: resetForm,
        }}
      >
        <div className="flex flex-col gap-3">
          <FormInput
            label="Código"
            name="add-code"
            id="add-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={addForm?.locationType === "box" ? "CAJ-01" : "ARM-A"}
            required
          />
          <FormInput
            label="Nombre"
            name="add-label"
            id="add-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={addForm?.locationType === "box" ? "Ej. Calentamiento" : "Armario A"}
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
        title="Eliminar ubicación"
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
  onDelete,
  children,
}: {
  title: string;
  code?: string;
  count: number;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="warehouse-bay">
      <BayHeader title={title} code={code} count={count} onDelete={onDelete} />
      <div className="warehouse-board">{children}</div>
    </section>
  );
}

function BayHeader({
  title,
  code,
  count,
  onDelete,
}: {
  title: string;
  code?: string;
  count: number;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="warehouse-bay__title">
          {code ? <WarehouseCabinetMark /> : <WarehouseBoxMark size="icon" />}
          {title}
          {code ? <span className="ml-2 font-normal text-muted-foreground">{code}</span> : null}
        </p>
        <p className="warehouse-bay__meta">
          {count === 1 ? "1 caja" : `${count} cajas`}
        </p>
      </div>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Eliminar
        </button>
      ) : null}
    </div>
  );
}

function CrateMenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="warehouse-crate__menu"
      aria-label={`Acciones de ${label}`}
    >
      <MoreHorizontal className="size-4" aria-hidden />
    </button>
  );
}

function AddCrateButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="warehouse-crate warehouse-crate--add warehouse-crate--interactive">
      <div className="warehouse-crate__figure">
        <WarehouseBoxMark ghost />
      </div>
      <p className="warehouse-crate__add-label">Añadir caja</p>
    </button>
  );
}

function EmptyBoxesState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-[var(--radius-lg)] border border-dashed border-[var(--club-border)] px-6 py-12 text-center">
      <WarehouseBoxMark code="CAJ-01" size="lg" />
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
