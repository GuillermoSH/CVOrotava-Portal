# CVOrotava Portal

Portal web del **Club Voleibol Orotava** para **familias** (padres/tutores) y **dirección**: gestión orientada a **anotación de pagos** (transferencia o presencial; sin cobro online en el portal) y **reserva de ropa** del club.

## Stack

- **Next.js 15** (App Router) + TypeScript + ESLint  
- **Tailwind CSS v4** + **shadcn/ui** (Base UI primitives)  
- **Supabase** (Auth, Postgres; RLS en migraciones futuras)  
- **pnpm** (`packageManager` en `package.json`)

## Requisitos

- Node.js 20+  
- pnpm (recomendado: `corepack enable` o `npm i -g pnpm`; en Windows si `pnpm` no está en PATH, puedes usar `npx pnpm@9.15.0 <comando>`)

## Configuración local

1. Clonar el repositorio e instalar dependencias:

   ```bash
   pnpm install
   ```

2. Copiar variables de entorno **nunca** subas `.env.local` al control de versiones:

   ```bash
   cp .env.example .env.local
   ```

   Rellena `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y, solo en servidor, `SUPABASE_SERVICE_ROLE_KEY` (ver [Supabase](https://supabase.com/dashboard)).

3. Arrancar en desarrollo:

   ```bash
   pnpm dev
   ```

4. Producción / comprobación de build:

   ```bash
   pnpm build
   pnpm start
   ```

## Estructura (resumen)

| Ruta | Uso |
|------|-----|
| `app/(marketing)/` | Landing pública (`/`) |
| `app/(auth)/` | Login (sin registro público en la app) |
| `app/(dashboard)/parents` | Área familias |
| `app/(dashboard)/admin` | Área dirección |
| `components/ui/` | shadcn |
| `components/layout/`, `dashboard/`, `payments/`, `clothing/`, `shared/` | UI reutilizable por dominio |
| `lib/supabase/` | Cliente browser, servidor, middleware (refresh sesión) |
| `lib/constants.ts` | Rutas, roles, paleta en TS |
| `lib/types/db.ts` | Tipos dominio hasta generar tipos desde Supabase |

**Regla:** si un bloque de UI se usa en **≥2** pantallas, extraer a `components/`.

## Paleta (marca; sin negro/rojo/blanco puros)

Definida en `app/globals.css` y en `lib/constants.ts` como `clubPaletteLight` / `clubPaletteDark` (`clubPalette` apunta al set oscuro):

- Fondo: `#0F0F12`  
- Superficie: `#18181B` / `#27272A`  
- Borde: `#3F3F46`  
- Marca: `#C8102E` (fuerte `#9F0C24`, suave `#F2D7DC`)  
- Texto: `#FAFAF9` / muted `#A1A1AA`

Tema por defecto **según sistema**; modo claro/oscuro manual desde el icono de tema (cabecera y panel).

Tokens Tailwind v4: `app/globals.css` + `@config` → [`tailwind.config.mjs`](./tailwind.config.mjs) (rutas `content`).

## Seguridad

- No commitear secretos: `.env*` está en `.gitignore`; solo `.env.example` es plantilla.  
- `SUPABASE_SERVICE_ROLE_KEY` solo en **servidor** (p. ej. `lib/supabase/service-role.ts`), nunca en `NEXT_PUBLIC_*` ni en componentes cliente.

## Licencia

Propietaria — ver [LICENSE.md](./LICENSE.md).

## Siguientes pasos (fuera de este bootstrap)

- UI real (formularios, tablas, flujos) y mocks de datos  
- Esquema Supabase + RLS + políticas por rol (`parent` / `admin`)
