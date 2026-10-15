---
target: /ropa y subpáginas (admin ropa hub)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/guillermosh/Projects/CVOrotava-Portal/app/(dashboard)/admin/ropa"
timestamp: 2026-10-15T07-25-26Z
slug: app-dashboard-admin-ropa
---
Method: dual-agent (A: 303a50fc-bc59-4de2-8d8b-2668a3b54d27 · B: affbdc7e-2208-4a95-8f08-6d1abfe514da)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Meta + Ahora help; “1 abiertos” duplicates meta and doesn’t name the next set step |
| 2 | Match System / Real World | 3 | Spanish ops fit; scoreboard “set” is mostly chrome vs the next verb |
| 3 | User Control and Freedom | 2 | Shell/nav OK; hub search has no clear/submit — must pick a destination chip |
| 4 | Consistency and Standards | 2 | Lit CTA inside band vs DESIGN.md; almacén reuses `--lit` for “Filtro” |
| 5 | Error Prevention | 2 | Search looks global then forks to 3 routes — easy wrong door |
| 6 | Recognition Rather Than Recall | 3 | Labeled lanes/nav; status line doesn’t surface the next action |
| 7 | Flexibility and Efficiency | 2 | Deep-link helps; Enter→best match missing; extra click after query |
| 8 | Aesthetic and Minimalist Design | 1 | Full red slab + KPI digit + competing accents = anti-thesis noise |
| 9 | Error Recovery | 2 | Empty set OK; hub offers little diagnose/recover beyond navigate away |
| 10 | Help and Documentation | 1 | No inline meaning for statuses, Ahora, or how Buscar works |
| **Total** | | **22/40** | **Acceptable** |

#### Design Specificity Verdict

**LLM assessment**: The surface brief and DESIGN.md ask for volleyball scoreboard grammar — one precise lit “Ahora,” dense neutrals, tabular digits, not KPI cards. The IA and component names commit (`ClothingSetBand`, `.ropa-board`, `ropa-digit`), and order detail’s cockpit is closer to the thesis. The hub’s lit treatment lands as a **full-bleed brand flood**: wall-to-wall `.ropa-set-band--lit`, a large “1 / abiertos” KPI, and “Abrir pedido” nested inside the red field — which DESIGN.md explicitly forbids. That composition could ship on any SaaS status hero with a brand-color swap; the volleyball metaphor is labeled (“AHORA”) more than made. User instinct that the red banner “no cuadra” is correct: it reads as alert/promo, not a lit set cell.

**Deterministic scan**: CLI `impeccable detect` on `app/(dashboard)/admin/ropa` + `components/clothing` returned **0 findings** (exit 0). Browser live inject on localhost:3002 found **9 / 8 / 16** issues on hub / pedidos / almacén — mainly `undersized-ui-text` (nav ~10.4px, almacén “ud” ~10px), `layout-transition`, `overused-font` (Geist 100%), plus hub `low-contrast` (3.9:1 red-on-dark) and `dark-glow` on the lit band shadow. Detector and LLM agree the lit red treatment is a problem; detector adds type-size and motion-on-layout debt the LLM under-weighted.

**Visual overlays**: Assessment B successfully injected detect.js on hub, pedidos, and almacén at `http://localhost:3002`. Overlays rendered during that pass; they are not guaranteed to remain visible unless those browser tabs are still open.

#### Overall Impression

Bones are right (cycle IA, Spanish ops copy, one-featured-story wiring). The hub first viewport oversells brand red as a hero slab and under-delivers the next verb. Biggest opportunity: shrink the lit set to a scoreboard signal and put the CTA on neutral chrome — exactly what DESIGN.md already asks for.

#### What's Working

1. **IA matches the textile cycle** — Pedidos → Almacén → Entregas → Prendas with domain-native Spanish (“Registrar entrega”, “uds en caja”).
2. **Component intent is sound** — `ClothingSetBand` / ops lanes / `ropa-digit` / board nav encode the thesis; `OrderCockpit` + score strip show denser board grammar working.
3. **Hub prefers one featured story** — featured order → pending locate → empty set, instead of three equal KPI tiles.

#### Priority Issues

**1. [P1] Full-bleed lit ClothingSetBand feels wrong**
- **What**: `.ropa-set-band--lit` paints the entire wide band brand-solid; right cell is open-order KPI; CTA lives inside the red.
- **Why it matters**: Reads as marketing hero / alert, burns attention before ops work, violates DESIGN.md lit rules; matches the user’s complaint.
- **Fix**: Lit as a narrow signal (left rail / hairline / muted panel + lit label). Move “Abrir pedido” to neutral chrome. Replace or drop “1 abiertos” (meta already counts opens).
- **Suggested command**: `$impeccable quieter` (then `$impeccable layout`)

**2. [P1] Ahora names the object, not the next verb**
- **What**: Band title = order reference; body = status · supplier; CTA = “Abrir pedido”.
- **Why it matters**: Staff need what to do now; OrderCockpit already uses guidance titles — hub lags.
- **Fix**: Drive hub band from the same guidance model (“Recibir PED-…”, “Ubicar N uds”); demote reference to secondary line.
- **Suggested command**: `$impeccable clarify`

**3. [P1] Competing primary signals on one hub**
- **What**: Lit band + always-accented “Registrar entrega” + brand-tint icons + 5-tab nav + search fork.
- **Why it matters**: Breaks “one lit region”; high cognitive load; first-timers can’t tell the real next step.
- **Fix**: Accent a lane only when it is the Ahora target; consider collapsing Accesos if Ahora + nav suffice.
- **Suggested command**: `$impeccable distill`

**4. [P2] ClothingHubSearch is a router, not a search**
- **What**: Input + three destination chips; no results; no Enter default; focus ring suppressed.
- **Why it matters**: Looks like global find; forces recall of which catalog holds the hit; a11y regress.
- **Fix**: Enter → best destination or unified results; restore focus; or relabel “Ir a…”.
- **Suggested command**: `$impeccable clarify` / `$impeccable harden`

**5. [P2] Lit grammar reused for non-Ahora states**
- **What**: Almacén builds a `--lit` band labeled “Filtro”; browser also flags tiny “ud” labels and layout transitions.
- **Why it matters**: Dilutes the scoreboard contract; undersized UI text hurts warehouse mobile use.
- **Fix**: Filter chrome = neutral chip/strip; reserve `--lit` for true active set; bump section/meta type floors.
- **Suggested command**: `$impeccable quieter` + `$impeccable typeset` / `$impeccable audit`

#### Persona Red Flags

**Alex (Power User)**: Hub search = type then choose among 3 chips — no Enter accelerator; open order reachable twice (band + “Pedido abierto” lane); “1 abiertos” is noise; no keyboard shortcuts on the board.

**Sam (Accessibility)**: Search uses `focus-visible:ring-0`; lit CTA is underline-only on brand fill; detector reports 3.9:1 contrast and dark-glow on lit band; nav labels ~10.4px; almacén “ud” ~10px.

**Jordan (First-Timer)**: After “Pedido enviado · Hummel” the next action is unclear; Buscar looks broken until a destination is picked; “AHORA” and accented “Registrar entrega” disagree on priority.

#### Minor Observations

- Meta line and band score duplicate the open-order count.
- Page subtitle restates board nav.
- `ClothingHubCards` name telegraphs leftover KPI-card framing.
- CSS split between `app/globals.css` and `.impeccable/ropa-board.css` — drift risk.
- Entregas chrome is thinner than hub/pedidos board grammar.
- Browser `overused-font` / `layout-transition` hits are systemic board debt, not hub-only.

#### Questions to Consider

1. If the lit set were only a left rail or digit cell, would “AHORA” still need a large red rectangle?
2. Should the hub band title be a verb (“Recibir”, “Ubicar”, “Entregar”) with the order ID demoted — matching OrderCockpit?
3. DESIGN.md bans CTAs inside the lit band — why is `ropa-set-band__cta` the primary interaction of ClothingSetBand?
4. Can Accesos rápidos die if Ahora + five-tab nav already cover the cycle?
5. Is “1 abiertos” scoreboard craft — or KPI-card thinking that survived the redesign?
