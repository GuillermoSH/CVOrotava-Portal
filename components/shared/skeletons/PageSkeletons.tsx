"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { ClothingHubQuickLinks } from "@/components/clothing/ClothingHubQuickLinks";
import { ClothingStickyActionBar } from "@/components/clothing/ClothingStickyActionBar";
import { WarehouseBoxMark } from "@/components/clothing/WarehouseBoxMark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/club/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/club/Table";
import { Bone, FilterChipRow, FilterChipsSkeleton, FormFieldBone, ListCardBone, SearchBone } from "@/components/shared/Bone";
import { appRoutes } from "@/lib/constants";
import { INVENTORY_STATUS_LABELS } from "@/lib/clothing/constants";
import type { DashboardRouteChrome, DashboardSkeletonKind } from "@/lib/layout/dashboard-route-chrome";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        <Bone className="h-8 w-48 max-w-full rounded-lg sm:h-9 sm:w-64" />
        <Bone className="h-4 w-72 max-w-full rounded-md" />
      </div>
      <Bone className="h-10 w-full rounded-lg sm:w-36" />
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

function KpiTile({
  title,
  helper,
  href,
  wide,
}: {
  title: string;
  helper: string;
  href: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group block min-h-11 rounded-[var(--radius-lg)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--club-brand)_40%,transparent)]",
        wide && "col-span-2 lg:col-span-1",
      )}
    >
      <Card
        size="sm"
        className="h-full transition-[border-color,box-shadow] group-hover:border-[var(--club-border-hover)] group-hover:shadow-[var(--club-shadow-card-hover)]"
      >
        <CardHeader className="gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <CardTitle className="text-sm font-semibold leading-snug">{title}</CardTitle>
            <span className="shrink-0 text-xs text-muted-foreground">{helper}</span>
          </div>
          <Bone className="h-9 w-16 rounded-md" />
        </CardHeader>
      </Card>
    </Link>
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
    <div className={cn("warehouse-crate", lines > 0 && "warehouse-crate--inventory")}>
      <div className="warehouse-crate__figure">
        <WarehouseBoxMark size={lines > 0 ? "sm" : "md"} />
      </div>
      <div className="warehouse-crate__body">
        <div className="warehouse-crate__identity">
          <Bone className="h-4 w-14 rounded-md" />
          <Bone className="h-3 w-24 rounded-md" />
        </div>
        {lines > 0 ? (
          <div className="warehouse-crate__lines">
            {Array.from({ length: lines }, (_, index) => (
              <div key={index} className="warehouse-crate__line">
                <Bone className="h-3.5 w-[55%] rounded-md" />
                <Bone className="h-3 w-10 rounded-md" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AdminBody() {
  return (
    <>
      <section>
        <h2 className="section-title mb-4">Indicadores</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminMetricCard title="Inventario de ropa" helper="Almacén interno" chart />
          <AdminMetricCard title="Morosos críticos" helper="≥ 2 cuotas" />
          <AdminMetricCard title="Pagos este mes" helper="Meta mensual" chart />
        </div>
      </section>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Resumen de pagos</CardTitle>
            <CardDescription>
              Recaudación anual, mensual y previsión de tienda (reservas de ropa).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 md:grid-cols-3 md:gap-6">
              {["Recaudación del año", "Recaudado en el mes", "Previsto por reservas de ropa"].map((label) => (
                <div key={label} className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <Bone className="h-8 w-28 rounded-md" />
                  <Bone className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Últimos pagos registrados</CardTitle>
            <CardDescription>Movimientos ficticios de ejemplo.</CardDescription>
          </CardHeader>
          <CardContent>
            <TableRowsSkeleton rows={4} cols={5} />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function HubBody() {
  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="section-title">Indicadores</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <KpiTile title="Pedidos abiertos" helper="activos" href={appRoutes.clothing.orders} />
          <KpiTile title="Pendiente ubicar" helper="lotes" href={appRoutes.clothing.warehouse} />
          <KpiTile title="En almacén" helper="unidades" href={appRoutes.clothing.warehouse} wide />
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-title">Operaciones</h2>
        <ClothingHubQuickLinks />
      </section>
    </>
  );
}

function PlayersBody() {
  return (
    <div className="flex flex-col gap-4">
      <SearchBone />
      <FilterChipsSkeleton count={4} className="" />
      <FilterChipRow labels={["Activos", "Todos"]} />
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

function PlayerFormBody() {
  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Jugador">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormFieldBone />
          <FormFieldBone />
          <FormFieldBone />
          <FormFieldBone />
        </div>
      </FormSection>
      <FormSection title="Club">
        <FormFieldBone />
        <Bone className="h-10 w-40 rounded-lg" />
        <Bone className="h-11 w-full rounded-lg" />
      </FormSection>
      <FormSection title="Trámites">
        <Bone className="h-14 w-full rounded-xl" />
        <Bone className="h-14 w-full rounded-xl" />
      </FormSection>
      <FormSection title="Salud">
        <FormFieldBone wide />
      </FormSection>
      <FormSection title="Contacto familiar">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormFieldBone />
          <FormFieldBone />
          <FormFieldBone />
          <FormFieldBone />
        </div>
      </FormSection>
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
      <p className="text-sm text-muted-foreground">
        <Bone className="inline-block h-4 w-40 rounded-md align-middle" />
      </p>
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
      <SearchBone />
      <FilterChipRow labels={["Todos", INVENTORY_STATUS_LABELS.pending_storage, INVENTORY_STATUS_LABELS.stored]} />
      <section className="warehouse-pending">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <WarehouseBoxMark ghost size="icon" />
          Por ubicar
        </h2>
        <ul className="mt-3 flex flex-col gap-1.5">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5">
              <Bone className="h-4 w-[48%] rounded-md" />
              <Bone className="h-4 w-10 rounded-md" />
            </li>
          ))}
        </ul>
      </section>
      <div className="warehouse-board">
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
    hub: <HubBody />,
    players: <PlayersBody />,
    "player-form": <PlayerFormBody />,
    deliveries: <DeliveriesBody />,
    products: <ProductsBody />,
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
    <div className="flex flex-col gap-6">
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
