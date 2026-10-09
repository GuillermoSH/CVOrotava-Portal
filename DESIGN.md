---
name: CVOrotava Portal
description: Club volleyball portal — Operate surfaces use a scoreboard grammar for ropa admin.
colors:
  club-bg-light: "#f0f0f4"
  club-fg-light: "#12121a"
  club-fg-muted-light: "#3f3f50"
  club-brand-light: "#d01e1e"
  club-surface-2-light: "#e8e8ec"
  club-bg-dark: "#0d0d0f"
  club-fg-dark: "#f0f0f5"
  club-fg-muted-dark: "#a0a0b0"
  club-brand-dark: "#e62222"
  club-surface-2-dark: "#1c1c1a"
  club-success: "#047857"
  club-warning: "#eab308"
  club-info: "#3b82f6"
  ropa-lit-fg: "#fafaf9"
typography:
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  section:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    letterSpacing: "-0.02em"
  digit:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    letterSpacing: "-0.02em"
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.06em"
  field:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.01em"
  group:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 550
rounded:
  xs: "0.25rem"
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
spacing:
  lane-gap: "0.35rem"
  panel-pad: "1rem"
  section-gap: "1.25rem"
components:
  ropa-set-band-lit:
    backgroundColor: "{colors.club-brand-light}"
    textColor: "{colors.ropa-lit-fg}"
    rounded: "{rounded.md}"
    padding: "1rem 1.1rem"
  ropa-ops-lane:
    backgroundColor: "var(--club-surface)"
    textColor: "{colors.club-fg-light}"
    rounded: "{rounded.sm}"
    padding: "0.65rem 0.85rem"
  ropa-filter-chip-active:
    backgroundColor: "{colors.club-brand-light}"
    textColor: "{colors.ropa-lit-fg}"
    rounded: "{rounded.sm}"
    height: "2.25rem"
---

# Design system

## Overview

CVOrotava Portal is a bilingual-ready club tool with Spanish UI. Brand color is club red on cool neutrals (light and dark tokens in `app/globals.css`). Authenticated admin **ropa** surfaces use an Operate “marcador de set” world: one lit active step, dense tabular counts, mate scoreboard panels — not generic KPI cards.

## Colors

- **Primary:** `--club-brand` / `--club-brand-strong` (red) for primary actions and the lit “Ahora” set.
- **Neutrals:** `--club-bg`, `--club-surface`, `--club-surface-2`, `--club-fg`, `--club-fg-muted`, `--club-border`.
- **Semantic:** success / warning / info tokens for receiving states and badges.
- **Ropa lit band:** brand fill + `--primary-foreground` ink; only one region uses full brand fill at a time.
- Never pure `#000000`, `#FFFFFF`, or `#FF0000`.

## Typography

Operate surfaces use one workhorse sans (system UI stack). Hierarchy: page `.section-title` (~1.125–1.25rem) → panel/section `.ropa-panel__title` / `.ropa-section-heading` (1rem/650) → uppercase `.ropa-section-label` (0.6875rem) → field `.form-label` and group `.ropa-group-label` (0.75rem muted) → body 0.875rem. Scores via `.ropa-digit` with tabular nums. No display/marketing faces on admin tools.

## Layout

- Ropa routes wrap in `.ropa-board` (`app/(dashboard)/admin/ropa/layout.tsx`) with horizontal `.ropa-board-nav`.
- Hub first viewport: meta counts → lit `ClothingSetBand` → search → ops lanes.
- Order detail: `.ropa-panel` (status + sets stepper + cockpit) then verification groups.
- Mobile-first warehouse density; desktop adds kanban and denser verification strips.
- Structural breakpoints (collapse columns / stack), not fluid display type.

## Elevation & Depth

Tonal panels and 1px borders dominate. Lit set uses a soft brand-tinted shadow (`0 2px 10px` mix). Avoid glass stacks and KPI card shadows on ropa.

## Shapes

Prefer `--radius-sm` / `--radius-md` on ropa board chrome (tighter than marketing cards). Status chips use `--radius-xs`.

## Components

| Pattern | Role |
|---|---|
| `ClothingSetBand` | Single active operational step (“Ahora”) |
| `ClothingOpsLanes` | Hub / shortcut rows |
| `ropa-score-strip` | Pedidas / recibidas / faltantes / tallas |
| `ropa-verify-group` | Product → size X/Y receiving |
| `ropa-sets` | Order status as numbered sets |
| `ropa-status` | Compact status chip |
| `ropa-order-row` / `ropa-kanban-*` | Order list & board |
| Club `Button` / forms | Shared controls; keep vocabulary consistent |

Sheets/dialogs for clothing keep existing behavior; chrome follows opaque drawer tokens.

## Do's and Don'ts

**Do**

- Light one next step in brand red; keep lists/stock on neutrals.
- Use tabular digits for all counts and X/Y receiving.
- Keep Spanish task copy; name the action on controls.
- Preserve clothing business flows when changing visuals.

**Don't**

- Rebuild ropa as equal-weight KPI metric cards.
- Put interactive buttons inside a lit red band (actions sit on neutral panels).
- Introduce purple SaaS gradients, cream/terracotta “AI default,” or pure black/white/red.
- Add decorative page-load motion; state transitions stay ≤250ms.
