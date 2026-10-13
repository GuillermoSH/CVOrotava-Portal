---
target: admin/pagos (listado + drawers de registro individual y en bloque)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:app/(dashboard)/admin/pagos + components/payments/PlayersPaymentsPageClient.tsx"
timestamp: 2026-10-13T18-00-00Z
slug: app-dashboard-admin-pagos
---
⚠️ DEGRADED: single-context (la sesión no lanza subagentes; la superficie exige sesión admin y no se pudo inspeccionar en el navegador)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Se ve "qué falta", no qué se pagó, cuándo ni con qué método |
| 2 | Match System / Real World | 2 | El club piensa en T/E por jugador y mes; la UI habla de "concepto" e "importe" |
| 3 | User Control and Freedom | 1 | No hay forma de corregir ni anular un cobro mal anotado |
| 4 | Consistency and Standards | 3 | Hereda bien sheets y controles del club |
| 5 | Error Prevention | 3 | Pista de resto/sobrante y salto de cubiertos están bien pensados |
| 6 | Recognition Rather Than Recall | 2 | Los meses son chips sin cuadrícula: hay que recordar cuál es cuál |
| 7 | Flexibility and Efficiency | 1 | ≥6 interacciones por cobro; el bloque exige seleccionar + sheet + línea + mes |
| 8 | Aesthetic and Minimalist Design | 2 | Candy strip de badges (matrícula, equipación, rachas de meses) por fila |
| 9 | Error Recovery | 2 | Errores claros, pero sin deshacer tras registrar |
| 10 | Help and Documentation | 2 | Descripciones correctas; nada que enseñe el atajo |
| **Total** | | **20/40** | **Acceptable (bajo)** |

#### Design Specificity Verdict

**LLM assessment**: Es una lista + formulario de manual: "tabla con acción por fila que abre un cajón". Podría ser el módulo de cobros de cualquier SaaS. No refleja el modelo mental del club, que ya existe y funciona en su Excel: una cuadrícula jugador × mes donde cada celda se rellena con una letra. La lógica de tarifas (obligaciones, resto, vencido/por llegar) es sólida y específica; la superficie la esconde detrás de un formulario.

**Deterministic scan**: `impeccable detect` sobre `components/payments`: 0 hallazgos. El problema es de interacción, no de estilo.

**Visual overlays**: no disponibles (ruta autenticada).

#### Overall Impression

Funciona y es correcto, pero convierte una tarea de **una pulsación** (poner T en una celda) en un **flujo de formulario** (abrir, elegir concepto, comprobar importe, fecha, método, notas, confirmar). La mayor oportunidad: sustituir "registrar pago" por una **matriz de cobro** donde la celda es la unidad de trabajo.

#### What's Working

1. La lógica de obligaciones (`fees.ts`): resto por concepto/mes, parciales y vencido contra por llegar. Es exactamente lo que una matriz necesita pintar.
2. El salto de jugadores ya cubiertos y la pista de sobrante evitan errores sin pedir confirmaciones.
3. Método T/E ya es un concepto de primera clase en los datos (`method`).

#### Priority Issues

**[P0] Demasiadas interacciones por cobro**
- **What**: Un cobro individual = abrir drawer → elegir "qué se cobra" → revisar importe → (fecha) → método → confirmar. El Excel: 1 toque.
- **Why it matters**: Cobrar a 150 jugadores × 9 meses es la tarea principal; cada interacción de más se multiplica por cientos.
- **Fix**: Celda de matriz con registro en un toque (método y fecha ya fijados en la barra superior de la sesión); el drawer queda solo para el caso raro (parcial, importe distinto, nota).
- **Suggested command**: `/impeccable shape` (modelo de la matriz) → `/impeccable layout`

**[P0] No existe vista jugador × mes con método**
- **What**: El listado resume "qué falta" en badges; no muestra qué mes está pagado, con T o E, ni parcial.
- **Why it matters**: No se puede conciliar con el banco ni responder "¿pagó noviembre?" sin abrir cada ficha.
- **Fix**: Columnas Matrícula · Equip. · Oct…Jun; cada celda con estado (T, E, parcial con importe, vencido, por llegar, no aplica).
- **Suggested command**: `/impeccable shape`, `/impeccable layout`

**[P1] Sin corrección ni anulación**
- **What**: Un T que debió ser E, o un cobro a otro jugador, no se puede arreglar desde el portal.
- **Why it matters**: Con registro en un toque, el error es más barato de cometer y debe ser igual de barato de deshacer.
- **Fix**: Deshacer inmediato (toast) + tocar una celda pagada para cambiar método o anular.
- **Suggested command**: `/impeccable harden`

**[P1] El registro en bloque modela el caso equivocado**
- **What**: "Mismo concepto para N jugadores" obliga a seleccionar, abrir sheet, elegir línea y mes. El caso real es "a cada jugador, su mes y su método", repetido.
- **Fix**: La matriz sustituye al bloque; opcional: acción de columna "marcar todo el mes como pagado" para los casos masivos.
- **Suggested command**: `/impeccable distill`

**[P2] Móvil sin variante propia**
- **What**: Una matriz de 11 columnas no cabe a 390px.
- **Fix**: Columna de jugador fija y scroll horizontal con celdas de 44px, o tarjeta de jugador que despliega su rejilla de meses.
- **Suggested command**: `/impeccable adapt`

#### Persona Red Flags

**Tesorería (Alex, volumen):** cobra en tandas; un cajón por cobro rompe el ritmo y no puede revisar por columna ("¿quién debe noviembre?").
**Casey (móvil, en el pabellón):** anota en el momento de recibir el efectivo; no puede esperar a abrir y completar un formulario por jugador.
**Sam (accesibilidad):** la matriz debe ser operable con teclado (flechas + T/E) y no depender solo del color para T/E/parcial.

#### Minor Observations

- "Registrar pago en bloque" aparece solo con selección: descubribilidad baja.
- Los meses por llegar en gris pueden leerse como "todo bien".
- No hay total por mes ni por jugador, que el Excel da gratis con una fila al pie.

#### Questions to Consider

- Si el Excel ya es el modelo mental, ¿por qué el portal pide más pasos que una hoja de cálculo?
- ¿Es la fecha de cobro un dato por cobro o un dato de la sesión de cobro?
- ¿Cuántas veces al mes se necesita de verdad un importe distinto al de tarifa?
