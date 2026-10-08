---
target: admin/ropa (todas las páginas de ropa)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/home/guillermosh/Projects/CVOrotava-Portal/app/(dashboard)/admin/ropa"
timestamp: 2026-10-08T13-10-31Z
slug: app-dashboard-admin-ropa
---
Method: dual-agent (A: fee4e0da-73c9-42a3-9eff-3c6723b59cc8 · B: c677a918-0f81-4a3c-83db-0917e9516e99)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Meta counts OK; unlit “Ahora” still labeled Ahora; sticky/dock hide board edges |
| 2 | Match System / Real World | 3 | Marcador/set language fits club; serigrafía stages need warehouse literacy |
| 3 | User Control and Freedom | 3 | Back/Cancelar present; sticky primary actions hard under dock |
| 4 | Consistency and Standards | 2 | `.section-title` ~1.25rem vs `.ropa-section-heading` 1rem; sticky short vs tall mismatch |
| 5 | Error Prevention | 2 | Prendas exposes Eliminar/Desactivar per row; hydration noise on MobileNavTop |
| 6 | Recognition Rather Than Recall | 3 | Status/kanban labels help; hub buries Buscar under six lanes |
| 7 | Flexibility and Efficiency | 2 | Power paths exist but duplicate (lanes + sticky + board tabs) |
| 8 | Aesthetic and Minimalist Design | 1 | Triple chrome; 6 hub lanes; 9 pedido filters; full size grid |
| 9 | Error Recovery | 2 | Empty CTAs good; Dev issues badge overlays Inicio dock |
| 10 | Help and Documentation | 2 | Spanish helpers exist; no floor-first cue when idle |
| **Total** | | **22/40** | **Acceptable** |

#### Design Specificity Verdict

**LLM assessment**: Scoreboard grammar is real and product-authored — `.ropa-board`, ClothingSetBand “Ahora”, tabular `.ropa-digit`, mate panels, club-red lit accents, Spanish ops copy. Not generic SaaS KPI cards. Operate intent is undercut by shell dock + ClothingBoardNav + ClothingStickyActionBar stacking (~180px mobile chrome), hub IA that puts six Accesos rápidos before Buscar (vs DESIGN: Ahora → search → lanes), and warehouse/pedido surfaces that still feel admin CRUD.

**Deterministic scan**: CLI `impeccable detect` exit 0, 3 advisory `design-system-font-size` hits at 10px (`OrderListView.tsx:169/174`, `ProductsPageClient.tsx:402`). Soft intentional-density exception, but correlates with runtime undersized-text overlays.

**Visual overlays**: Injected `detect.js` via live-server **8411** on hub, pedidos, almacén, entregas, prendas. Runtime overlays surfaced undersized bottom-nav text, low-contrast red CTAs, kanban flush edges, cramped prendas padding, skipped h1→h3. False positives: overused Geist font, layout property animation, glowing shadow noise.

#### Overall Impression

The marcador-de-set world is the right idea and already visible in tokens and ClothingSetBand — but chrome and first-viewport IA fight it. Biggest opportunity: fix sticky/dock scroll padding and distill the hub so one lit next step + search own the field, not six equal lanes under stacked bars.

#### What's Working

1. ClothingSetBand + `.ropa-digit` scoreboard vocabulary is distinctive and on-brand.
2. Dense touch targets on ops lanes / size chips (~2.75–3.375rem) show warehouse intent.
3. Empty-state Spanish copy is task-named (“Ir a inventario”, “Nuevo pedido”, “Nueva caja”).

#### Priority Issues

**[P0] Sticky scroll reserve wrong for stacked bars**
- **What**: Hub/almacén sticky measured ~124px; frame pads only `--clothing-sticky-bar-height` 4.25rem (~74px); main also only clears dock.
- **Why it matters**: First viewport and end-of-scroll content sit under sticky+dock (hub lanes/search; almacén empty; carga Infantil/Sumar).
- **Fix**: Map stacked 2-action bars to `sticky:"tall"` / compute from layout; ensure `clothing-page-with-sticky` padding includes actual bar + shell-dock-offset once.
- **Suggested command**: `$impeccable harden` (scroll / sticky safe-area)

**[P0] Hub IA vs Operate first-viewport contract**
- **What**: Actual order: meta → unlit Ahora → Accesos rápidos (6) → Buscar; sticky duplicates Almacén/Entrega.
- **Why it matters**: Search and true next action buried; six equal lanes flatten hierarchy.
- **Fix**: Lit/neutral Ahora + search strip first; collapse lanes to 2–3 ranked ops; remove sticky duplicates or one primary.
- **Suggested command**: `$impeccable distill`

**[P1] Pedidos filter chip explosion on mobile**
- **What**: List view shows ~9 status chips; empty CTA clipped by chrome; kanban flush to scroller edge (detector).
- **Why it matters**: Operate board should be one lit band + dense list, not a filter candy strip.
- **Fix**: Abiertos/Todos primary; other statuses in overflow/select; pad empty state above sticky; kanban edge inset.
- **Suggested command**: `$impeccable clarify`

**[P1] Carga por lote dumps entire size catalog**
- **What**: `/admin/ropa/almacen/agregar` shows Adulto+Infantil+Única (~22 inputs); lower rows under sticky.
- **Why it matters**: Thumb-zone warehouse entry becomes a spreadsheet; miss-taps and scroll fights.
- **Fix**: Collapse size groups; default Adulto/last-used; tall sticky; keep Sumar above chrome.
- **Suggested command**: `$impeccable adapt`

**[P2] Type hierarchy drift + CTA contrast**
- **What**: Forms use `.section-title` (~1.25rem); board uses `.ropa-section-heading` (1rem); detector flags low contrast on red primary CTAs and 10px badges; pedidos skips h1→h3.
- **Why it matters**: Breaks Operate one-scale rhythm; red-on-red ink hurts floor readability.
- **Fix**: Map ropa heads to ropa tokens; raise CTA ink contrast; bump badge floor or accept documented exception; restore heading ladder.
- **Suggested command**: `$impeccable typeset`

#### Persona Red Flags

**Alex (Power User)**: Hub sticky duplicates lanes; pedidos kanban horizontal scroll clips last column; prendas 30×4 row actions; no `/pedidos/[id]` data to stress cockpit.

**Sam (Accessibility)**: MobileNavTop hydration overlay; Dev badge covers Inicio; muted tab / unlit Ahora contrast; sticky over content without enough scroll padding; skipped heading levels.

**Casey (Mobile warehouse)**: 5-tab ropa-board-nav cramped at 390; stacked sticky ~124px + dock; carga sizes under sticky; entregas historial filters heavy below fold.

#### Minor Observations

- Copy glitch: “30 activa s” / “0 registro s” plural spacing
- DESIGN warns against controls inside lit band — CTA still in `.ropa-set-band`
- Desktop almacén: four peer header actions
- Empty kanban reads as five equal zero columns, not one lit Ahora
- Products route chrome sticky flag vs client `clothing-page-with-sticky` mismatch
- Order detail not reviewable (zero open orders in env)

#### Questions to Consider

- If the board only lights one Ahora, why does every ropa route also wear a five-segment nav plus a sticky action strip?
- Would a warehouse phone ever need nine pedido status chips before the next open order?
- Is “Sin set activo” still allowed to wear the Ahora jersey, or should idle be a quiet meta line + one Nuevo pedido CTA?
