# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Come lavoriamo insieme

### Prima di toccare codice
Leggi sempre i file interessati per capire struttura, stile e convenzioni esistenti. Adattati allo stile già presente.

### Dichiara le assunzioni
Se qualcosa non è chiaro, scrivi esplicitamente le assunzioni prima di procedere. Preferibile un'assunzione dichiarata a una decisione nascosta nel codice.

### Definisci il successo prima di scrivere codice
Per ogni task descrivi: comportamento atteso, output previsto, criterio che dimostra che il lavoro è corretto. Poi procedi in autonomia senza chiedere conferma a ogni passo.

### Flusso per ogni task
1. Riassumi il problema
2. Elenca eventuali assunzioni
3. Definisci il criterio di successo
4. Implementa
5. Verifica
6. Mostra il diff minimo
7. Riassumi cosa è stato fatto

### Modifiche chirurgiche
Tocca solo ciò che serve. Niente riformattazioni, rinominazioni o riordini non collegati al task. Il diff deve essere il più piccolo possibile.

### Niente refactoring non richiesti
Se individui codice migliorabile ma non è parte del task: segnalalo e spiega brevemente, ma non modificarlo senza richiesta esplicita.

### Se il cambiamento cresce
Se servono più di 3 file o cambiamenti strutturali importanti, fermati e spiega il motivo prima di procedere.

### Verifica prima di concludere
- Il codice continua a funzionare
- Nessun warning evitabile introdotto
- Nessuna variabile o funzione inutilizzata
- Nessun TODO non richiesto
- Diff minimo

### Convenzioni
- Commenti in italiano solo quando migliorano realmente la comprensione
- Messaggi di errore chiari e utilizzabili, non semplici stack trace
- Nessuna nuova dipendenza senza motivazione concreta

## Development Commands

### Start servers (run in separate terminals)
```powershell
# Backend — from /server
cd server
node index.js
# or with auto-reload:
npx nodemon index.js

# Frontend — from /client
cd client
npx vite
```

### Install dependencies
```powershell
cd server && npm install
cd client && npm install
```

### Load/reset the database schema
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d fuelmanager -f server/models/schema.sql
```

## Environment Setup

**Backend** requires `server/.env` (not committed):
```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/fuelmanager
JWT_SECRET=<secret>
PORT=3001
CLIENT_URL=http://localhost:5173
```

**Local PostgreSQL credentials**: user=`postgres`, password=`postgres`, db=`fuelmanager` (PostgreSQL 17).

The Vite dev server proxies `/api` to `http://localhost:3001` — both servers must be running locally.

## Architecture

```
Fuel MENAGEMENT APP/
├── client/          # React 18 + Vite + Tailwind SPA
└── server/          # Node.js + Express 5 API (ESModules)
```

### Backend (`server/`)

- **`index.js`** — Express app entry point; mounts all route prefixes under `/api/`
- **`config/db.js`** — PostgreSQL pool via `pg`. Exports both named (`{ pool }`) and default. All route files import `{ pool }`.
- **`middleware/auth.js`** — `verifyToken` (JWT Bearer) and `requireRole(roles[])` middleware
- **`routes/`** — One file per resource; raw parameterized SQL via `pool.query()`
- **`utils/auditLog.js`** — Call `logAuditEvent()` in route handlers to write to `audit_log` table
- **`utils/tankAlerts.js`** — Checks tank level thresholds and inserts notifications
- **`models/schema.sql`** — All table definitions; safe to re-run (`IF NOT EXISTS`)

All server files use **ESModules** (`"type": "module"` in package.json). Always use `.js` extensions on local imports.

### Frontend (`client/src/`)

- **`main.jsx`** → **`App.jsx`** — Router root; `AuthProvider` wraps everything
- **`contexts/AuthContext.jsx`** — Auth state, JWT in `localStorage` (`fuel_manager_token` / `fuel_manager_user`). Exposes `login`, `register`, `logout`, `loginWithToken`, `updateUser`.
- **`api/index.js`** — Axios instance; base URL `/api`; auto-attaches Bearer token; redirects to `/login` on 401
- **`api/*.js`** — One module per resource wrapping the axios instance
- **`i18n/`** — react-i18next with 4 locales: `it`, `en`, `tr`, `es`. User language pref synced at login.
- **`pages/company/`** — Main app pages (tanks, aircraft, vehicles, operations, reports, etc.)
- **`pages/superadmin/`** — Superadmin portal (companies, plans)
- **`components/ui/`** — Shared primitives: Button, Card, Input, Modal, Alert, Badge

### Roles & Multi-tenancy

Three roles: `superadmin`, `admin`, `operator`. Every data table has `company_id` — always filter by `req.user.company_id` in queries. Superadmin has no `company_id` and sees all companies.

### Route protection pattern

- Protected pages use `<ProtectedRoute>` / `<ProtectedRoute requiredRole="superadmin">`
- API routes: compose `verifyToken` then optionally `requireRole(['admin'])` as middleware

### Database schema (13 tables)

`subscription_plans` → `companies` → `users`, `bases`, `tanks`, `tank_loads`, `quality_checks`, `aircraft`, `ground_vehicles`, `fueling_operations`, `notifications`, `audit_log`, `company_settings`

### Key behaviors

- **Fueling operations** deduct from tank stock and record per-aircraft/vehicle
- **Tank loads** add stock; `tankAlerts.js` fires after each load/operation to check thresholds
- **Reports** route generates PDF (PDFKit) or Excel (ExcelJS) server-side; served as file download
- **Logo upload**: Multer saves to `server/uploads/`; served at `/uploads/<file>`
- **Invite flow**: Token in `users.invite_token`; accepted via `/invite/:token` public page
