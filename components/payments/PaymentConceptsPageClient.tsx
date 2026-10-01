"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/club/Badge";
import { Button } from "@/components/club/Button";
import { FormInput } from "@/components/club/forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { TableActionsCell, TableIconAction, TableTextAction } from "@/components/club/TableActions";
import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import {
  createPaymentConceptAction,
  setPaymentConceptActiveAction,
  updatePaymentConceptAction,
} from "@/lib/actions/payments/concepts";
import type { PaymentConcept } from "@/lib/types/db";
import { appToast } from "@/lib/toast";

type FormState = {
  id?: string;
  concept: string;
  amount: string;
  is_matricula: boolean;
  is_active: boolean;
};

function emptyForm(): FormState {
  return { concept: "", amount: "", is_matricula: false, is_active: true };
}

function formFromConcept(concept: PaymentConcept): FormState {
  return {
    id: concept.id,
    concept: concept.concept,
    amount: String(concept.amount),
    is_matricula: concept.is_matricula,
    is_active: concept.is_active,
  };
}

export function PaymentConceptsPageClient({ concepts }: { concepts: PaymentConcept[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(concept: PaymentConcept) {
    setForm(formFromConcept(concept));
    setFormError(null);
    setFormOpen(true);
  }

  function submit() {
    const amount = Number(form.amount.replace(",", "."));
    startTransition(async () => {
      const result = form.id
        ? await updatePaymentConceptAction({
            id: form.id,
            concept: form.concept.trim(),
            amount,
            is_matricula: form.is_matricula,
            is_active: form.is_active,
          })
        : await createPaymentConceptAction({
            concept: form.concept.trim(),
            amount,
            is_matricula: form.is_matricula,
          });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      appToast.success(form.id ? "Concepto actualizado" : "Concepto creado");
      setFormOpen(false);
      router.refresh();
    });
  }

  function toggleActive(concept: PaymentConcept) {
    startTransition(async () => {
      const result = await setPaymentConceptActiveAction(concept.id, !concept.is_active);
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      appToast.success(concept.is_active ? "Concepto desactivado" : "Concepto activado");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Se ofrecen al registrar un pago en /admin/pagos. Desactiva uno en vez de borrarlo si ya
            se ha usado.
          </p>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            Nuevo
          </Button>
        </div>

        <div className="flex flex-col gap-2.5 md:hidden">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className={`clothing-list-card flex items-center justify-between gap-3 ${
                concept.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {concept.concept} — {concept.amount} €
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {concept.is_matricula ? (
                    <Badge variant="info" className="text-[10px]">
                      Cuenta como matrícula
                    </Badge>
                  ) : null}
                  {!concept.is_active ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Inactivo
                    </Badge>
                  ) : null}
                </div>
              </div>
              <TableTextAction label="Editar" onClick={() => openEdit(concept)} />
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <div className="glass-panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="club-table__actions">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concepts.map((concept) => (
                  <TableRow key={concept.id} className={concept.is_active ? "" : "opacity-60"}>
                    <TableCell>
                      <p className="club-table__primary">{concept.concept}</p>
                    </TableCell>
                    <TableCell className="tabular-nums">{concept.amount} €</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {concept.is_matricula ? (
                          <Badge variant="info" className="text-[11px]">
                            Matrícula
                          </Badge>
                        ) : null}
                        <Badge variant={concept.is_active ? "success" : "secondary"} className="text-[11px]">
                          {concept.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableActionsCell>
                      <TableIconAction label="Editar" icon={Pencil} onClick={() => openEdit(concept)} />
                      <TableTextAction
                        label={concept.is_active ? "Desactivar" : "Activar"}
                        onClick={() => toggleActive(concept)}
                      />
                    </TableActionsCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ClothingBottomSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? "Editar concepto" : "Nuevo concepto"}
        primaryAction={{
          label: form.id ? "Guardar" : "Crear",
          pending,
          disabled: !form.concept.trim() || !form.amount.trim(),
          onClick: submit,
        }}
        secondaryAction={{ label: "Cancelar", onClick: () => setFormOpen(false) }}
      >
        <div className="flex flex-col gap-4">
          {formError ? (
            <div
              className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </div>
          ) : null}
          <FormInput
            label="Concepto"
            name="concept-name"
            id="concept-name"
            className="min-h-11"
            value={form.concept}
            onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
            placeholder="Ej. Cuota mensual"
          />
          <FormInput
            label="Importe (€)"
            name="concept-amount"
            id="concept-amount"
            type="number"
            min="0"
            step="0.01"
            className="min-h-11"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="25"
          />
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-[var(--club-border)] accent-brand"
              checked={form.is_matricula}
              onChange={(e) => setForm((f) => ({ ...f, is_matricula: e.target.checked }))}
            />
            <span>
              Cuenta como matrícula
              <span className="block text-xs text-muted-foreground">
                Un pago con este concepto marca al jugador como “matrícula pagada” en /admin/pagos.
              </span>
            </span>
          </label>
          {form.id ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-[var(--club-border)] accent-brand"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Activo (visible al registrar un pago)
            </label>
          ) : null}
        </div>
      </ClothingBottomSheet>
    </>
  );
}
