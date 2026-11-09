"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { ReactNode } from "react";

import { ClothingHubSearch } from "@/components/clothing/ClothingHubSearch";
import { ClothingHubQuickLinks } from "@/components/clothing/ClothingHubQuickLinks";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { Input } from "@/components/club/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/club/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { ControlSubnav, type ControlSection } from "@/components/payments/control/shared";
import { Bone, FilterChipRow, FilterChipsSkeleton, FormFieldBone, ListCardBone, SearchBone } from "@/components/shared/Bone";
import { appRoutes } from "@/lib/constants";
import { INVENTORY_STATUS_LABELS } from "@/lib/clothing/constants";
import type { DashboardRouteChrome, DashboardSkeletonKind } from "@/lib/layout/dashboard-route-chrome";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        <Bone className="h-8 w-48 max-w-full rounded-lg sm:h-9 sm:w-64" />
        <Bone className="h-4 w-72 max-w-full rounded-md" />
      </div>
      <Bone className="h-10 w-full rounded-lg sm:w-36" />
    </div>
  );
}

/** Buscador de ropa ya pintado (sin datos que esperar), inerte hasta que llega la página. */
function StaticRopaSearch({ placeholder, className }: { placeholder: string; className?: string }) {
  return (
    <div className={cn("ropa-search", className)}>
      <Input
        type="search"
        readOnly
        tabIndex={-1}
        placeholder={placeholder}
        aria-hidden
        className="min-h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-[var(--club-border)] pt-8 first:border-t-0 first:pt-0">
      <div>
        <h2 className="section-title">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function AdminMetricCard({
  title,
  helper,
  chart,
}: {
  title: string;
  helper: string;
  chart?: boolean;
}) {
  return (
    <Card size="sm" className="flex h-full flex-col">
      <CardHeader className="gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <span className="text-xs text-muted-foreground">{helper}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {chart ? <Bone className="mx-auto size-32 rounded-full" /> : <Bone className="h-12 w-20 rounded-md" />}
      </CardContent>
    </Card>
  );
}

function CrateBone({ lines = 2 }: { lines?: number }) {
  return (
    <div className={cn("ropa-bin", lines === 0 && "ropa-bin--empty")}>
      <div className="ropa-bin__head">
        <div className="ropa-bin__id">
          <Bone className="h-3 w-14 rounded-md" />
          <Bone className="mt-2 h-4 w-28 rounded-md" />
        </div>
        <Bone className="h-7 w-8 rounded-md" />
      </div>
      {lines > 0 ? (
        <div className="ropa-bin__body">
          {Array.from({ length: lines }, (_, index) => (
            <div key={index} className="ropa-bin__row">
              <Bone className="h-3.5 w-[55%] rounded-md" />
              <Bone className="h-3 w-10 rounded-md" />
              <Bone className="h-3.5 w-6 rounded-md" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Bloque de cifras con las mismas medidas que `HomeKpiStrip` / `ControlDashboard`: etiqueta conocida, valor en hueso. */
function KpiStripBone({ labels }: { labels: string[] }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-[var(--club-border)] rounded-xl border border-[var(--club-border)] bg-[var(--club-surface)] max-lg:divide-y",
        labels.length === 4 ? "lg:grid-cols-4 lg:divide-x" : "lg:grid-cols-2 lg:divide-x",
      )}
    >
      {labels.map((label) => (
        <div key={label} className="flex min-w-0 flex-col gap-1 px-5 py-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Bone className="my-0.5 h-7 w-28" />
          <Bone className="mt-1 h-1.5 w-full rounded-full" />
          <Bone className="my-0.5 h-3 w-40 max-w-full" />
        </div>
      ))}
    </div>
  );
}

/** Fila de lista con dos líneas a la izquierda y un valor a la derecha (misma altura que las reales). */
function ListRowBone({ twoLineValue = false }: { twoLineValue?: boolean }) {
  return (
    <li className="flex min-h-12 items-center justify-between gap-4 border-t border-[var(--club-border)] py-2 first:border-t-0">
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Bone className="h-4 w-[42%] max-w-full" />
        <Bone className="h-3 w-[62%] max-w-full" />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <Bone className="h-4 w-16" />
        {twoLineValue ? <Bone className="h-3 w-12" /> : null}
      </span>
    </li>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {hint ? <div className="text-sm text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Inicio: cifras arriba y «Por hacer» (grupos de filas) debajo. */
function AdminBody() {
  return (
    <div className="flex flex-col gap-8">
      <KpiStripBone labels={["Cobrado esta temporada", "Vencido sin cobrar", "Altas completas", "Ropa en el almacén"]} />
      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Por hacer"
          hint="Lo que está pendiente en pagos, jugadores y ropa. Cada fila te lleva a resolverlo."
        />
        <div className="flex flex-col gap-5">
          {[3, 2, 2].map((rows, group) => (
            <div key={group}>
              <Bone className="mb-2 h-4 w-20" />
              <ul className="flex flex-col">
                {Array.from({ length: rows }, (_, i) => (
                  <ListRowBone key={i} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const CONTROL_REVIEW_LABELS = ["Vencidos sin cobrar", "Matrículas pendientes", "Cobros sin concepto", "Cobrado de más"];

/** Panel de control económico: subnav, cifras, qué revisar, gráfico por mes, deudores y cobros recientes. */
function ControlBody() {
  return (
    <div className="flex flex-col gap-6">
      <ControlSubnav active="overview" />
      <div className="flex flex-col gap-8">
        <KpiStripBone
          labels={["Cobrado esta temporada", "Vencido sin cobrar", "Matrícula pendiente", "Cobrado este mes"]}
        />
        <div className="grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <div className="flex min-w-0 flex-col gap-8">
            <section className="flex flex-col gap-3">
              <SectionHeading title="Qué revisar" hint={<Bone className="mt-1 h-4 w-80 max-w-full" />} />
              <ul className="flex flex-col">
                {CONTROL_REVIEW_LABELS.map((label) => (
                  <li
                    key={label}
                    className="flex min-h-12 items-center justify-between gap-4 border-t border-[var(--club-border)] py-2 first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{label}</span>
                      <Bone className="mt-1 h-3 w-40 max-w-full" />
                    </span>
                    <Bone className="h-4 w-20 shrink-0" />
                  </li>
                ))}
              </ul>
            </section>
            <section className="flex flex-col gap-3">
              <SectionHeading
                title="Cuotas cobradas por mes"
                hint="Cuotas al día sobre las que tocan cada mes. Vencen el día 10."
              />
              <div className="grid grid-cols-10 items-end gap-2">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="flex min-w-0 flex-col items-stretch gap-1.5">
                    <Bone className="mx-auto h-3 w-8" />
                    <Bone className="h-28 w-full" />
                    <Bone className="mx-auto h-3 w-6" />
                  </div>
                ))}
              </div>
            </section>
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <SectionHeading title="A quién reclamar" hint={<Bone className="mt-1 h-4 w-64 max-w-full" />} />
                <span className="btn-secondary pointer-events-none min-h-9 text-sm">Avisos por correo</span>
              </div>
              <ul className="flex flex-col">
                {Array.from({ length: 5 }, (_, i) => (
                  <ListRowBone key={i} />
                ))}
              </ul>
            </section>
          </div>
          <aside className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-foreground">Últimos cobros</h2>
              <ul className="flex flex-col">
                {Array.from({ length: 5 }, (_, i) => (
                  <ListRowBone key={i} twoLineValue />
                ))}
              </ul>
              <span className="btn-secondary pointer-events-none min-h-9 w-fit text-sm">Ver todos los pagos</span>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

/** Subpáginas del control: subnav (la sección activa ya se sabe) y una lista de filas bajo una línea de resumen. */
function ControlListBody({ active }: { active: ControlSection }) {
  return (
    <div className="flex flex-col gap-6">
      <ControlSubnav active={active} />
      <div className="flex flex-col gap-4">
        <Bone className="h-4 w-96 max-w-full" />
        <ul className="flex flex-col">
          {Array.from({ length: 7 }, (_, i) => (
            <ListRowBone key={i} twoLineValue={active === "matricula" || active === "unassigned"} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Pagos: línea de resumen y enlaces, filtros y la matriz de jugadores × conceptos. */
function PaymentsBody() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Bone className="h-4 w-72 max-w-full" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-brand">Tarifas</span>
          <span className="text-sm text-brand">Avisos</span>
          <span className="btn-primary pointer-events-none min-h-10">Cobro rápido</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Bone className="h-11 w-full rounded-lg sm:max-w-xs" />
        <Bone className="h-11 w-52 rounded-lg" />
        <Bone className="h-5 w-36" />
      </div>
      <div className="glass-panel flex min-h-0 flex-1 flex-col gap-0 overflow-hidden !p-0">
        <div className="flex items-center gap-3 border-b border-[var(--club-border)] px-4 py-3">
          <Bone className="size-4 shrink-0" />
          <Bone className="h-4 w-32" />
          <div className="ml-auto flex gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Bone key={i} className="hidden h-4 w-14 sm:block" />
            ))}
          </div>
        </div>
        {Array.from({ length: 11 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-[var(--club-border)] px-4 py-3 last:border-b-0">
            <Bone className="size-4 shrink-0" />
            <span className="flex flex-col gap-1.5">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-20" />
            </span>
            <div className="ml-auto flex gap-3">
              {Array.from({ length: 6 }, (_, c) => (
                <Bone key={c} className="hidden h-6 w-14 rounded-md sm:block" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HubBody() {
  return (
    <div className="ropa-hub">
      <div className="ropa-hub__ahora">
        <Bone className="h-4 w-48" />
        <Bone className="h-[7.5rem] w-full rounded-[var(--radius-md)]" />
      </div>
      <ClothingHubSearch />
      <section className="ropa-hub__ops">
        <h2 className="ropa-section-label">Accesos rápidos</h2>
        <ClothingHubQuickLinks />
      </section>
    </div>
  );
}

/** Acciones de la cabecera de Jugadores mientras carga: se ven ya, sin esperar a saber el rol (los botones se activan con los datos). */
export function PlayersPendingToolbar() {
  const inert = { "aria-disabled": true, tabIndex: -1 } as const;
  return (
    <div className="clothing-toolbar hidden md:flex">
      {["WhatsApp", "Exportar CSV", "Importar Excel", "Importar federación", "Alta rápida"].map((label) => (
        <span key={label} className="btn-secondary pointer-events-none" {...inert}>
          {label}
        </span>
      ))}
      <Link href={appRoutes.players.new} className="btn-primary">
        Nuevo jugador
      </Link>
    </div>
  );
}

/** Buscador de jugadores (idéntico al real, sin datos que esperar), filtros en hueso y lista. */
function PlayersBody() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex w-full flex-col gap-2 md:min-w-0 md:flex-1">
          <div
            className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-[var(--club-surface-2)] px-3"
            aria-hidden
          >
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-h-10 flex-1 content-center text-sm text-muted-foreground">
              Buscar nombre, DNI, teléfono…
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[72, 96, 88, 80].map((w) => (
              <Bone key={w} className="h-9 rounded-full" style={{ width: w }} />
            ))}
          </div>
        </div>
        <div className="flex min-h-11 items-center gap-2.5 md:mt-1 md:min-h-8 md:shrink-0 md:px-1" aria-hidden>
          <span className="size-4 shrink-0 rounded border border-[var(--club-border)]" />
          <span className="text-sm font-medium text-foreground">
            Mostrar bajas
            <Bone className="ml-1.5 inline-block h-3.5 w-6 align-middle" />
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index}>
            <ListCardBone chips={2} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barra superior de la ficha (misma altura y posición que la real): se queda también al cargar. */
function PlayerBarBone() {
  return (
    <div className="-mx-4 mb-6 flex h-14 items-center gap-2 border-b border-[var(--club-border)] bg-background px-4 md:-mx-6 md:gap-3 md:px-6">
      <Bone className="size-9 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Bone className="h-5 w-44 max-w-full" />
        <Bone className="h-3 w-28" />
      </div>
      <Bone className="hidden h-9 w-36 rounded-lg md:block" />
      <Bone className="hidden h-9 w-24 rounded-lg md:block" />
      <Bone className="hidden size-9 rounded-lg md:block" />
      <Bone className="hidden h-9 w-28 rounded-lg md:block" />
    </div>
  );
}

/** Misma estructura que la ficha: columna lateral (foto, equipo) y secciones planas. */
function PlayerFormBody({ withBar = false }: { withBar?: boolean }) {
  const section =
    "flex flex-col gap-3 border-t border-[var(--club-border)] pt-8 first:border-t-0 first:pt-0";
  return (
    <div className={cn(withBar && "-mt-4 lg:-mt-6")}>
      {withBar ? <PlayerBarBone /> : null}
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className="flex flex-col gap-8">
          <div className={section}>
            <Bone className="h-6 w-28" />
            <Bone className="aspect-square w-full max-w-64 rounded-xl" />
          </div>
          <div className={section}>
            <Bone className="h-6 w-20" />
            <FormFieldBone />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-8">
          <div className={section}>
            <Bone className="h-6 w-24" />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormFieldBone />
              <FormFieldBone />
              <FormFieldBone />
              <FormFieldBone />
            </div>
          </div>
          <div className={section}>
            <Bone className="h-6 w-24" />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormFieldBone />
              <FormFieldBone />
              <FormFieldBone />
              <FormFieldBone />
            </div>
          </div>
          <div className={section}>
            <Bone className="h-6 w-36" />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormFieldBone />
              <FormFieldBone />
            </div>
          </div>
          <div className={section}>
            <Bone className="h-6 w-28" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FormFieldBone />
              <FormFieldBone />
              <FormFieldBone />
              <FormFieldBone />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveriesBody() {
  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Jugador">
        <FormFieldBone />
        <FormFieldBone wide />
      </FormSection>
      <FormSection title="Prendas" hint="Aún no hay prendas">
        <div className="clothing-add-card">
          <Plus className="size-5 text-brand" aria-hidden />
          <span className="clothing-add-card__label">Añadir prenda del stock</span>
          <span className="clothing-add-card__hint">Por tipo, nombre o dorsal</span>
        </div>
      </FormSection>
    </div>
  );
}

function ProductsBody() {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-sm text-muted-foreground">
        <Bone className="inline-block h-4 w-40 rounded-md align-middle" />
      </div>
      <div className="flex flex-col gap-2.5 md:hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <ListCardBone key={index} chips={3} />
        ))}
      </div>
      <div className="hidden md:block">
        <div className="glass-panel overflow-hidden">
          <TableRowsSkeleton rows={6} cols={5} />
        </div>
      </div>
    </div>
  );
}

/** Prendas: buscador y filtros ya pintados; solo la lista espera datos. */
function ClothingProductsBody() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Input type="search" readOnly tabIndex={-1} placeholder="Buscar marca, modelo, color…" aria-hidden className="min-h-11" />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormFieldBone />
          <div className="flex flex-col justify-end">
            <FilterChipRow labels={["Todas", "Tienda"]} />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 md:hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <ListCardBone key={index} chips={3} />
        ))}
      </div>
      <div className="hidden md:block">
        <div className="glass-panel overflow-hidden">
          <TableRowsSkeleton rows={6} cols={5} />
        </div>
      </div>
    </div>
  );
}

function WarehouseBody() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:hidden">
        <Link
          href={appRoutes.clothing.deliveries}
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-brand"
        >
          Registrar entrega
        </Link>
        <Link
          href={appRoutes.clothing.locations}
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-brand"
        >
          Cajas
        </Link>
      </div>
      <StaticRopaSearch placeholder="Buscar prenda, talla o #dorsal" />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormFieldBone />
        <span className="flex min-h-11 items-end gap-2.5 pb-2 sm:items-center sm:pb-0 sm:pt-6">
          <span className="size-4 rounded border border-[var(--club-border)]" />
          <span className="text-sm font-medium text-foreground">Solo competición sin dorsal</span>
        </span>
      </div>
      <FilterChipRow labels={["Todos", INVENTORY_STATUS_LABELS.pending_storage, INVENTORY_STATUS_LABELS.stored]} />
      <section className="ropa-queue">
        <header className="ropa-queue__head">
          <div>
            <h2 className="ropa-queue__title">Por ubicar</h2>
            <p className="ropa-queue__meta">Cargando lotes…</p>
          </div>
        </header>
        <ul className="ropa-queue__list">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="ropa-queue__item">
              <Bone className="h-4 w-[48%] rounded-md" />
              <Bone className="h-8 w-16 rounded-md" />
            </li>
          ))}
        </ul>
      </section>
      <div className="ropa-rack__grid">
        <CrateBone />
        <CrateBone lines={3} />
        <CrateBone lines={1} />
        <CrateBone />
      </div>
    </div>
  );
}

function LocationsBody() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <div className="clothing-toolbar hidden md:flex">
          <Bone className="h-10 w-32 rounded-lg" />
          <Bone className="h-10 w-28 rounded-lg" />
        </div>
      </div>
      <div className="warehouse-board">
        <CrateBone lines={0} />
        <CrateBone lines={0} />
        <CrateBone lines={0} />
        <CrateBone lines={0} />
      </div>
    </div>
  );
}

function OrdersBody() {
  return (
    <div className="flex flex-col gap-3">
      <StaticRopaSearch placeholder="Buscar referencia, proveedor o prenda" className="mb-0" />
      <FilterChipRow labels={["Abiertos", "Todos"]} />
      <div className="flex flex-col gap-2.5 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <ListCardBone key={index} chips={2} trailingChip />
        ))}
      </div>
      <div className="hidden md:block">
        <div className="glass-panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Líneas</TableHead>
                <TableHead>Actualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }, (_, row) => (
                <TableRow key={row}>
                  {Array.from({ length: 5 }, (_, col) => (
                    <TableCell key={col}>
                      <Bone className={cn("h-4 rounded-md", col === 0 ? "w-24" : "w-16")} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function OrderFormBody() {
  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Datos del pedido">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <FormFieldBone />
          <FormFieldBone />
          <div className="sm:col-span-2">
            <FormFieldBone wide />
          </div>
        </div>
      </FormSection>
      <FormSection title="Líneas del pedido" hint="1 línea">
        <div className="grid gap-4 py-1 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:items-end">
          <FormFieldBone />
          <FormFieldBone />
          <FormFieldBone />
        </div>
      </FormSection>
    </div>
  );
}

function OrderDetailBody() {
  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel gap-0 !p-0">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-4 sm:px-5 sm:py-5">
          <Bone className="h-6 w-24 rounded-full" />
          <Bone className="h-4 w-36 rounded-md" />
        </div>
        <div className="border-t border-[var(--club-border)] px-4 py-4 sm:px-5 sm:py-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Progreso</p>
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Bone key={index} className="h-8 flex-1 rounded-full" />
            ))}
          </div>
        </div>
        <div className="border-t border-[var(--club-border)] px-4 py-4 sm:px-5 sm:py-5">
          <Bone className="h-10 w-40 rounded-lg" />
        </div>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="section-title md:hidden">Líneas del pedido</h2>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <ListCardBone key={index} chips={1} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SimpleCardBody({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function DashboardBodySkeleton({
  kind = "players",
  action,
}: {
  kind?: DashboardSkeletonKind;
  action?: DashboardRouteChrome["action"];
}) {
  const body = {
    admin: <AdminBody />,
    payments: <PaymentsBody />,
    control: <ControlBody />,
    "control-overdue": <ControlListBody active="overdue" />,
    "control-matricula": <ControlListBody active="matricula" />,
    "control-unassigned": <ControlListBody active="unassigned" />,
    "control-overpaid": <ControlListBody active="overpaid" />,
    hub: <HubBody />,
    players: <PlayersBody />,
    "player-form": <PlayerFormBody />,
    "player-detail": <PlayerFormBody withBar />,
    deliveries: <DeliveriesBody />,
    products: <ProductsBody />,
    "clothing-products": <ClothingProductsBody />,
    warehouse: <WarehouseBody />,
    locations: <LocationsBody />,
    orders: <OrdersBody />,
    "order-form": <OrderFormBody />,
    "order-detail": <OrderDetailBody />,
    parents: (
      <SimpleCardBody
        title="Cuotas y ropa"
        description="Aquí verás pagos anotados y reservas de equipación cuando conectemos datos reales o mocks."
      />
    ),
    profile: (
      <SimpleCardBody
        title="Información de usuario"
        description="Vista preliminar del perfil. Próximamente: nombre, rol y datos de acceso."
      />
    ),
  }[kind];

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando página</span>
      {body}
      {action && kind !== "hub" ? (
        <ClothingStickyActionBar actions={[{ type: "link", label: action.label, href: action.href }]} />
      ) : null}
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton className="mb-0" />
      <DashboardBodySkeleton />
    </div>
  );
}

export function TableRowsSkeleton({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: cols }, (_, col) => (
            <Bone
              key={col}
              className={cn("h-10 flex-1 rounded-md", col === 0 && "max-w-[12rem]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
