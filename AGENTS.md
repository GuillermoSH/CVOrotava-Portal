# CVOrotava Portal — contexto para agentes

## Producto

- Club **voleibol** Orotava (Tenerife).  
- Portal **bilingüe de contenido futuro**; UI y copy en **español** por defecto.  
- **Dos audiencias:** familias (`/parents`) y dirección (`/admin`).  
- **Pagos:** solo **anotación** en sistema (transferencia o efectivo); **no** pasarela de pago en web.  
- **Accesos:** sin registro público ni alta desde la app; cuentas las gestiona el club.  
- **Ropa:** reservas / catálogo (detalle en siguientes iteraciones).

## Stack fijo

- Next.js **15** App Router, TypeScript, ESLint.  
- Tailwind **v4** + **shadcn/ui** (estilo actual del repo).  
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`).  
- **pnpm** para dependencias.

## Diseño

- Paleta club en `app/globals.css` (`:root` claro, `html.dark` oscuro) + `clubPaletteLight` / `clubPaletteDark` en `lib/constants.ts` (`clubPalette` = oscuro, alias).  
- No usar `#000000`, `#FFFFFF` o `#FF0000` puros; usar tokens existentes.  
- Tema por defecto **sistema** (`next-themes` en `ThemeProvider`); toggle `ThemeToggle` en marketing y `AppShell`.

## Arquitectura / componentes

- Páginas en `app/**/page.tsx`: composición y datos; **poca** UI inline.  
- Componentes reutilizables en `components/` (`layout`, `dashboard`, `payments`, `clothing`, `shared`, `ui`).  
- Si algo se repite en **2+** sitios → extraer componente.

## Secretos y datos

- Variables en **`.env.local`** (no git). Plantilla: `.env.example`.  
- Nunca `SERVICE_ROLE` ni claves en cliente ni `NEXT_PUBLIC_*` inadecuados.  
- **Mocks:** datos ficticios; **no** datos reales de menores o familias.

## Rutas útiles

- `/` marketing  
- `/login` (sin registro público en la app; cuentas las gestiona el club)  
- `/parents`, `/admin`  

## Convenciones

- Imports con alias `@/`.  
- Middleware raíz refresca sesión Supabase (`lib/supabase/middleware.ts`).  
- Cliente browser: `lib/supabase/client.ts`. Servidor: `lib/supabase/server.ts`. Operaciones privilegiadas: `lib/supabase/service-role.ts` (solo servidor).

---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
