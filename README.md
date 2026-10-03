# ERP — Soporte

Herramienta interna de administración para gestionar casos de soporte importados desde GLPI, cruzarlos con las tareas del proveedor y consultar un dashboard de KPIs (con export a PPTX).

**Stack:** Next.js 14 (App Router), Supabase (Postgres + Auth), Tailwind + shadcn/ui, desplegado en Netlify.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Crea `.env.local` (está en `.gitignore`):

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon (auth en cliente y middleware) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role, **solo servidor** (acceso a datos) |

En Netlify se configuran en Site settings → Environment variables.

## Base de datos

Las migraciones están en `supabase/migrations/` y se ejecutan manualmente en el SQL editor de Supabase.

## Despliegue

```bash
npx netlify-cli@17 deploy --site <SITE_ID> --build --prod --message "..."
```

El historial de decisiones y cambios está en [`resumen.md`](./resumen.md).
