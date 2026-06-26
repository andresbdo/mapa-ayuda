# Mapa de Ayuda

Mapa colaborativo de **centros de acopio** (🔵 azul) y **puntos de entrega de ayuda** (🔴 cruz roja). Mundial, web-first, sin API keys de pago.

## Stack

- **Next.js 16** (App Router) — app + API en un monolito
- **MapLibre GL** + tiles de **OpenFreeMap** (gratis, sin key)
- **Nominatim** (OpenStreetMap) para buscar direcciones
- **Neon** (Postgres) + **Prisma 6**
- Deploy en **Vercel**

## Correr en local

```bash
npm install
npx prisma generate
npm run dev
```

Abrí http://localhost:3000

- `/` — el mapa público (filtros Todo / Acopio / Entrega, buscador, agregar punto)
- `/admin` — panel de administración (pide el `ADMIN_TOKEN`)

## Variables de entorno (`.env`)

```
DATABASE_URL=   # Neon pooled (runtime)
DIRECT_URL=     # Neon directa (migraciones)
ADMIN_TOKEN=    # token para entrar a /admin
```

## Moderación

- Toggle en vivo desde `/admin` (campo `moderationEnabled` en la tabla `Settings`).
- **ON**: los puntos nuevos quedan `PENDING` hasta que un admin los aprueba.
- **OFF**: modo libre, se publican al instante.

## Modelo de datos

- `Point` — type (COLLECTION/DELIVERY), name, lat/lng, items[], days[], hours, address, contact, status.
- `Settings` — fila única `global` con `moderationEnabled`.

Los puntos cercanos se filtran por bounding box (sin PostGIS).

## Deploy a Vercel

1. Subir el repo a GitHub.
2. Importar en Vercel.
3. Cargar `DATABASE_URL`, `DIRECT_URL`, `ADMIN_TOKEN` en Environment Variables.
4. Build por defecto (`next build`). El `postinstall` corre `prisma generate`.
