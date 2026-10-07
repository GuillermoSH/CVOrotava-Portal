# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary (ropa admin):** dirección / staff del Club Voleibol Orotava que gestiona pedidos a proveedor, recepción, serigrafía, ubicado en almacén (cajas) y entregas a jugadores. Uso frecuente en móvil en el local/almacén y en desktop para verificación densa de pedidos.

**Secondary:** familias (`/parents`) ven cuotas/ropa en su área; fuera del rediseño de ropa admin salvo alineación ligera de `PlayerClothingSection` si hace falta.

<!-- inferred from AGENTS.md + redesign brief; no live interview this session (no AskUserQuestion tool) -->

## Product Purpose

Portal del club para familias y dirección. En ropa, el producto hace posible **anotar y operar** el ciclo completo de material textil del club (pedido → recepción → serigrafía → almacén → entrega) sin pasarela de pago ni registro público.

Success for ropa: staff encuentra el siguiente paso correcto, verifica recepciones por prenda/talla, ubica stock y registra entregas con poca fricción en planta.

## Positioning

Herramienta operativa del club (no e-commerce ni inventario genérico SaaS): flujos específicos de voleibol (dorsales, serigrafía, cajas del club, entregas a jugadores) con cuentas solo gestionadas por el club.

## Operating Context

- Rutas admin: `/admin/ropa` (hub), pedidos (lista/nuevo/detalle), almacén, ubicaciones, entregas, prendas.
- Estados de pedido: borrador → enviado → recibido → serigrafía → vuelta → cerrado; verificación X/Y por talla; CTAs post-vuelta.
- Pagos del club son solo anotación (transferencia/efectivo); no aplica pasarela en ropa.
- Tema sistema + toggle; UI en español.
- Idea pendiente no implementar: QR por caja.

## Capabilities and Constraints

- Stack: Next.js 16 App Router, TypeScript, Tailwind v4, Supabase, componentes `components/club/` y `components/clothing/`.
- Preservar rutas, server actions, reglas de negocio y funcionalidad reciente (panel verificación, serigrafía, filtros almacén, CTAs post-vuelta).
- Tokens club en `app/globals.css` / `clubPalette*`; no `#000`/`#FFF`/`#FF000` puros.
- Sin schema/migrations salvo necesidad UI.
- Fuera de alcance: QR cajas, parents redesign, pagos/roster fuera de ropa.

## Brand Commitments

- Nombre: Club Voleibol Orotava / CVOrotava Portal.
- Paleta club roja (`--club-brand`) y superficies existentes; rediseño de ropa puede reinterpretar composición/jerarquía pero no abandonar tokens del club.
- Copy UI en español.
- Usuario pidió **reemplazo total** del look de ropa admin (anti-referencia el UI actual); no pulir el look viejo.

## Evidence on Hand

- Implementación actual en `app/(dashboard)/admin/ropa/**` y `components/clothing/**`.
- Mocks/datos de demo: ficticios; no inventar personas reales.
- No hay DESIGN.md previo; identidad visual club viva en CSS/tokens.

## Product Principles

1. Una tarea primaria por pantalla; el siguiente paso operativo debe ser obvio.
2. Escaneabilidad en almacén (móvil) y densidad en verificación de pedidos (desktop).
3. Consistencia de controles entre superficies de ropa; brand en detalle preciso, no en adorno.
4. No perder flujos de negocio al cambiar el mundo visual.
5. Español claro, estados semánticos legibles (faltante, completo, pendiente ubicar).

## Accessibility & Inclusion

- Controles táctiles usables en planta (min targets generosos en móvil).
- Contraste vía tokens club; focus visible existente a respetar/mejorar.
<!-- inferred; no WCAG target explicitly set by user -->
