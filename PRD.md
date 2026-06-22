# PRD — Fuel Manager
**Versione:** 1.0  
**Data:** 22 giugno 2026  
**Stato:** In sviluppo attivo (Fasi 1–6E completate)

---

## 1. Panoramica del prodotto

### Problema

Le aziende del settore aviazione generale, elicotterismo, scuole di volo e aerotaxi gestiscono i rifornimenti di carburante con fogli Excel, quaderni cartacei o sistemi ERP generalisti inadatti. I problemi concreti sono:

- **Nessuna tracciabilità in tempo reale** del livello dei serbatoi: ci si accorge che un serbatoio è vuoto solo sul campo.
- **Errori di tipo carburante**: un rifornimento con Jet A-1 invece di AvGas può distruggere un motore. I sistemi attuali non proteggono da questo errore.
- **Audit e conformità**: ENAC e EASA richiedono la tracciabilità completa di ogni erogazione. I dati su carta non sono ricercabili e si perdono.
- **Multi-base senza visibilità unificata**: un'azienda con 3 basi non sa in tempo reale cosa succede dove.
- **Nessun alert proattivo**: la soglia critica del serbatoio viene scoperta quando è troppo tardi per ordinare in tempo.

### Soluzione

Fuel Manager è una **web application SaaS multi-tenant** per la gestione completa del carburante in ambito aviation e ground transport. Ogni azienda cliente ha il proprio spazio isolato con:

- Gestione visuale di serbatoi, aeromobili e veicoli terrestri
- Registrazione guidata delle operazioni di rifornimento con validazione tipo carburante
- Alert automatici quando un serbatoio scende sotto la soglia
- Report esportabili (PDF e Excel) per compliance ENAC/EASA
- Audit log immutabile di ogni azione
- Accesso mobile-first via PWA installabile su smartphone

### Target

**Primario:**
- Aeroclub e scuole di volo (5–50 aeromobili, 1–3 basi)
- Operatori di elicotteri per lavoro aereo (fotogrammetria, eliski, emergenze)
- Aerotaxi e charter (fleet piccole, tracciabilità obbligatoria)

**Secondario:**
- Aziende con flotta veicoli terrestri mista (diesel/benzina) che vogliono unificare la gestione carburante
- Handling agent aeroportuali di piccole dimensioni

**Non target:** Grandi compagnie aeree (hanno sistemi ERP dedicati), distributori di carburante (business model diverso).

---

## 2. User Personas

### Persona 1 — Marco, Responsabile Operativo Aeroclub
- **Età:** 48 anni
- **Ruolo nel sistema:** Admin
- **Contesto:** Gestisce un aeroclub con 18 aeromobili (12 AvGas, 6 Jet A-1), 2 serbatoi fissi e un rifornimento mobile, 3 istruttori e 2 operatori a terra.
- **Obiettivo principale:** Sapere in tempo reale quanto carburante c'è, chi ha rifornito cosa e poter stampare il report mensile per la revisione ENAC in 5 minuti.
- **Frustrazioni attuali:** Il foglio Excel viene aggiornato "a memoria" a fine turno. A volte ci sono discrepanze. Una volta hanno rifornito un Diamond DA40 con Jet A-1 per sbaglio.
- **Come usa Fuel Manager:** Da desktop la mattina per il briefing operativo; sul telefono per inserire i rifornimenti sul campo; ogni mese genera il PDF per ENAC.

### Persona 2 — Sara, Operatrice di Campo
- **Età:** 28 anni
- **Ruolo nel sistema:** Operator
- **Contesto:** Lavora sul piazzale, esegue rifornimenti e spurghi. Non ha competenze IT avanzate. Lavora sempre con guanti e all'aperto.
- **Obiettivo principale:** Registrare un rifornimento in meno di 60 secondi senza sbagliare.
- **Frustrazioni attuali:** Il tablet aziendale non funziona bene al sole. La procedura attuale richiede di tornare in ufficio per segnare su Excel.
- **Come usa Fuel Manager:** Solo da smartphone (PWA installata). Tappa veloci: apre l'app, sceglie "Nuova operazione", seleziona serbatoio e aeromobile, inserisce i litri. Fine.

### Persona 3 — Luigi, SuperAdmin PilotCraft Solutions
- **Età:** 35 anni
- **Ruolo nel sistema:** Superadmin (gestore della piattaforma SaaS)
- **Contesto:** È il fondatore/team tecnico che eroga il servizio. Deve gestire clienti, piani, upgrade e monitorare MRR.
- **Obiettivo principale:** Vedere quante aziende sono attive, quante in trial stanno per scadere, il revenue per piano.
- **Come usa Fuel Manager:** Pannello superadmin per gestire le aziende, cambiare piani, sospendere account, vedere metriche globali.

---

## 3. Funzionalità Core per Priorità

### Must Have (implementate nelle Fasi 1–6E)

| Funzionalità | Descrizione |
|---|---|
| **Autenticazione multi-tenant** | Registrazione azienda, login, JWT, password hash bcrypt, protezione route per ruolo (superadmin / admin / operator) |
| **Gestione Basi** | CRUD basi operative con nome e posizione; ogni risorsa è associata a una base |
| **Gestione Serbatoi** | CRUD serbatoi fissi e mobili con tipo carburante (Jet A-1, AvGas 100LL, Diesel, Benzina), capacità, livello corrente, soglia minima, colore identificativo |
| **Carico Serbatoio** | Registrazione ricezione carburante da fornitore esterno con bolla di consegna |
| **Quality Check / Spurgo** | Registrazione spurgo (litri drenati, conformità, note) su serbatoio o aeromobile |
| **Gestione Aeromobili** | CRUD aeromobili con matricola, modello, tipo carburante, ore volo totali |
| **Gestione Veicoli** | CRUD veicoli terrestri con targa, nome, tipo carburante, km totali |
| **Operazione di Rifornimento** | Creazione rifornimento con transazione atomica: deduce dal serbatoio sorgente, aggiorna ore/km destinazione, valida compatibilità tipo carburante, blocca se litri insufficienti |
| **Dashboard** | Stat cards real-time (tank count, aircraft count, vehicle count, operazioni/litri oggi), alert serbatoi sotto soglia, azioni rapide |
| **Report Rifornimenti** | Tabella filtrabile per data, tipo destinazione, tipo carburante, operatore; export PDF e Excel |
| **Report Serbatoi** | Stato attuale tutti i serbatoi con barre di livello; export PDF |
| **Report Quality Check** | Tabella QC con filtri data; export PDF/Excel |
| **Invito Utenti** | Admin genera link invito (7 giorni, token sicuro); nuovo utente sceglie nome e password al primo accesso |
| **Gestione Team** | Lista utenti azienda, cambio ruolo inline, sospensione/riattivazione, eliminazione (auto-protezione: non puoi eliminare te stesso) |
| **Alert Soglia Serbatoio** | Notifica automatica quando il livello scende sotto `min_threshold_liters` dopo un rifornimento; auto-dismiss quando il serbatoio viene ricaricato |
| **Centro Notifiche** | Campana in header con badge non letti, dropdown preview 5 notifiche, pagina completa con filtri (tutto / non letti / critici / warning) |
| **Impostazioni Azienda** | Nome, logo (upload PNG/JPG/SVG/WebP, max 2 MB), colori brand (primary/secondary) con 16 preset + hex, preview live sidebar |
| **Gestione Basi in Settings** | CRUD basi integrato nei settings azienda |
| **Panoramica Piano** | Barre utilizzo (tanks, vehicles, users), feature flags attivi, conto alla rovescia trial |
| **Profilo Utente** | Modifica nome, lingua preferita (IT/EN/TR/ES), cambio password |
| **Audit Log** | Log immutabile di ogni azione critica (crea/elimina operazione, crea/modifica/elimina tank, invito utente, cambio ruolo) con filtri per tipo entità, azione, data, utente |
| **SuperAdmin Dashboard** | MRR stimato, totale operazioni globali, litri totali globali, distribuzione aziende per stato (trial/active/suspended) e per piano |
| **SuperAdmin Companies** | Tabella paginata aziende, ricerca, filtro stato, modal gestione per-company (cambio piano, cambio stato, metriche) |
| **SuperAdmin Plans** | Overview piani con revenue card, ARPU, distribuzione aziende per piano |
| **PWA Installabile** | manifest.json, service worker (cache-first statico, network-first API), banner installazione, icone home screen |
| **Bottom Nav Mobile** | Barra navigazione fissa in basso su mobile (lg:hidden) con Operations / Tanks / Aircraft / Reports / More + badge non letti |
| **i18n 4 lingue** | Tutte le stringhe UI in italiano, inglese, turco, spagnolo; lingua selezionabile per utente |

### Nice to Have (non ancora implementate)

| Funzionalità | Descrizione | Effort stimato |
|---|---|---|
| **Email reali** | Nodemailer per inviti utente e alert soglia serbatoio via email; ora i link invito devono essere copiati manualmente | M |
| **Dashboard Analytics avanzata** | Grafici storici consumi (30/90 giorni) con Recharts; trend per aeromobile; confronto periodi; consumo medio per ora di volo | L |
| **Foto contatore / firma** | Upload foto del contatore prima/dopo e firma digitale operatore direttamente nell'app (oggi i campi esistono in DB ma non c'è UI upload) | M |
| **Import CSV** | Import bulk aeromobili, veicoli, storico operazioni da CSV (feature plan Enterprise) | M |
| **Rate Limiting API** | express-rate-limit per prevenire brute force su /auth; oggi non è implementato | S |
| **Refresh token** | JWT access token a breve scadenza + refresh token per sessioni lunghe; oggi il token è long-lived | M |
| **Filtri avanzati operazioni** | Filtro per serbatoio sorgente, per matricola aeromobile specifico nell'OperationsPage | S |

### Future (roadmap lunga)

| Funzionalità | Descrizione |
|---|---|
| **App nativa iOS/Android** | Capacitor wrapper della PWA con accesso camera nativo per foto contatore |
| **Integrazione fatturazione** | Export dati per Fatture in Cloud / Xero; calcolo costo per operazione in base a prezzo al litro |
| **Firma digitale certificata** | Firma con certificato qualificato per documenti con valore legale |
| **API pubblica** | REST API documentata per integrazioni ERP clienti enterprise |
| **Gestione manutenzioni** | Scadenzario manutenzioni aeromobili con trigger automatici basati su ore di volo |
| **Multi-valuta / multi-fuso** | Per clienti fuori area euro |

---

## 4. User Flow Principale

### Flow: Operatore esegue un rifornimento (azione chiave del prodotto)

```
1. APERTURA APP
   └─ Utente apre la PWA dal telefono (icona home screen)
   └─ Service worker carica la shell offline
   └─ JWT valido → redirect automatico a /dashboard

2. DASHBOARD
   └─ Visualizza stat cards (N operazioni oggi, litri totali)
   └─ Se ci sono tank sotto soglia → vede alert rosso
   └─ Tocca "Nuova Operazione" (o pulsante nella bottom nav)

3. MODAL "NUOVA OPERAZIONE"
   Step A — Sorgente:
   └─ Sceglie "Da serbatoio" o "Da fornitore esterno"
   └─ Se serbatoio: seleziona dal dropdown (mostra litri disponibili)
   └─ Se esterno: inserisce nome fornitore/aeroporto

   Step B — Destinazione:
   └─ Sceglie tipo: Aeromobile / Veicolo / Serbatoio
   └─ Il dropdown si popola solo con entità compatibili per tipo carburante
     (es. se sorgente è Jet A-1, mostra solo aeromobili Jet A-1)
   └─ Seleziona l'entità specifica

   Step C — Dettagli:
   └─ Inserisce litri erogati
   └─ [Opzionale] Lettura contatore prima/dopo
   └─ [Opzionale] Ore volo attuali (per aeromobili) o km (per veicoli)
   └─ [Opzionale] Note libere
   └─ Data/ora: precompilata con "adesso", modificabile

4. CONFERMA
   └─ Tocca "Salva Operazione"
   └─ Backend esegue transazione:
       - Deduce litri dal serbatoio sorgente
       - Aggiorna ore/km dell'entità destinazione
       - Valida capienza (serbatoio non può andare sotto 0)
       - Se livello post-operazione < soglia → crea notifica
   └─ Risposta in < 500 ms
   └─ Modal si chiude, stat card "operazioni oggi" si aggiorna

5. FEEDBACK
   └─ [Se sotto soglia] Badge notifiche in header incrementa
   └─ Operatore torna alla dashboard o inserisce altra operazione
```

### Flow secondario: Admin genera report mensile ENAC

```
1. /dashboard/reports → tab "Rifornimenti"
2. Imposta date_from = primo del mese, date_to = oggi
3. [Opzionale] filtra per tipo carburante o operatore
4. Clicca "Scarica PDF"
5. Il browser scarica fuel_report_{date}.pdf
   └─ Contiene: intestazione azienda, tabella operazioni con tutti i campi,
      totali per tipo carburante, firma/data a piè di pagina
```

### Flow onboarding nuova azienda

```
1. /register → inserisce nome azienda, email, password
2. Account creato in stato "trial" (piano Trial: max 2 tank, max 2 utenti)
3. Redirect a /dashboard con banner trial attivo
4. Admin crea le basi (/dashboard/settings → tab Basi)
5. Admin crea i serbatoi (/dashboard/tanks)
6. Admin invita il primo operatore (/dashboard/users → Invita utente)
7. Operatore riceve link, sceglie password, accede direttamente
8. Prima operazione inserita → sistema è operativo
```

---

## 5. Struttura delle Pagine / Schermate

### Pagine Pubbliche

#### `/` — Landing Page
- Hero section con headline, CTA "Inizia gratis" → /register
- Sezione funzionalità chiave (3–4 card)
- Sezione piani/prezzi
- Header con LanguageSwitcher (IT/EN/TR/ES)
- Se utente già autenticato: redirect automatico a /dashboard

#### `/login` — Login
- Form email + password
- Link "Registra la tua azienda" → /register
- Redirect dopo login: /dashboard (admin/operator) o /superadmin (superadmin)

#### `/register` — Registrazione Azienda
- Form: nome azienda, email admin, password, conferma password
- Crea company con piano Trial, crea utente admin, restituisce JWT
- Redirect a /dashboard

#### `/invite/:token` — Accettazione Invito
- Pagina pubblica (non richiede login)
- Verifica token (scadenza 7 giorni), mostra email pre-compilata e ruolo assegnato
- Form: nome, cognome, password, conferma password
- Alla conferma: crea utente, restituisce JWT, redirect a /dashboard

---

### Portale Aziendale (Admin + Operator)

Layout comune: `AdminLayout` — sidebar sinistra (lg+), header con bell notifications + user menu, bottom nav fissa su mobile.

#### `/dashboard` — Dashboard Principale
- **4 stat cards** (serbatoi attivi, aeromobili, veicoli, operazioni oggi + litri oggi)
- **Pannello stato sistema**: semaforo tank levels (verde = tutti OK, rosso = N sotto soglia), operazioni di oggi, orario ultimo aggiornamento
- **Banner trial** (se status = trial): giorni rimanenti + link upgrade
- **4 quick actions** (Nuova Operazione, Gestisci Serbatoi, Gestisci Aeromobili, Report)
- Floating button "Nuova Operazione" → apre `NewOperationModal`

#### `/dashboard/tanks` — Serbatoi
- **Griglia card** serbatoi: nome, codice, tipo, base, barra livello (colorata con colore tank), litri/capacità, badge tipo carburante
- **Alert visivo** per tank sotto soglia (bordo rosso, icona warning)
- Pulsanti per ogni card: Aggiungi Carico, Quality Check, Storico, Modifica, Elimina
- FAB "Nuovo Serbatoio" → `TankFormModal`
- **`TankFormModal`**: nome, codice (univoco per azienda), tipo (fisso/mobile), tipo carburante, colore, capacità, soglia minima, base, istruzioni
- **`AddLoadModal`**: data carico, fornitore, litri, numero bolla, note
- **`QCModal`**: data, tipo (serbatoio/aeromobile), litri spurgo, esito (conforme/non conforme), note obbligatorie se non conforme
- **`TankHistoryModal`**: lista cronologica carichi + operazioni per quel serbatoio

#### `/dashboard/bases` — Basi Operative
- Tabella basi: nome, posizione, stato (attiva/inattiva)
- Inline edit / delete con conferma
- Form creazione: nome obbligatorio, location testuale, coordinate opzionali

#### `/dashboard/aircraft` — Aeromobili
- Griglia card: matricola, modello, tipo carburante (badge colorato), ore volo totali, stato attivo/inattivo
- `AircraftFormModal`: matricola (univoca per azienda), modello, tipo carburante, ore volo iniziali, note

#### `/dashboard/vehicles` — Veicoli Terrestri
- Griglia card: targa, nome, tipo carburante, km totali, stato
- `VehicleFormModal`: targa (univoca), nome, tipo carburante, km iniziali, note

#### `/dashboard/operations` — Operazioni di Rifornimento
- **Tabella paginata** (100 righe per caricamento, scroll infinito o paginazione)
- Colonne: data/ora, operatore, sorgente (serbatoio o esterno), destinazione (matricola/targa/nome serbatoio), tipo carburante, litri, note
- **Filtri**: data_from, data_to, tipo destinazione (aeromobile/veicolo/serbatoio), tipo sorgente
- Admin può eliminare un'operazione (rollback automatico livello serbatoio)
- Pulsante "Nuova Operazione" in alto a destra → `NewOperationModal`
- **`NewOperationModal`**:
  - Sorgente: dropdown "Serbatoio" (mostra nome + litri disponibili) o "Esterno" (campo testo nome)
  - Destinazione: segmented control Aeromobile / Veicolo / Serbatoio; dropdown filtrato per tipo carburante compatibile
  - Campi: data/ora, litri, contatore prima, contatore dopo, ore volo (se aeromobile), km (se veicolo), note
  - Validazioni frontend: litri > 0, destinazione selezionata, compatibilità tipo carburante mostrata visivamente

#### `/dashboard/reports` — Report ed Export
- **3 tab**: Rifornimenti | Serbatoi | Quality Check
- **Tab Rifornimenti**: filtri (date range, dest_type, fuel_type, operatore), tabella risultati con summary cards (totale ops, totale litri, n. aeromobili, n. veicoli riforniti), bottoni "Scarica Excel" e "Scarica PDF"
- **Tab Serbatoi**: stato attuale tutti i serbatoi con barre livello, bottoni export
- **Tab QC**: tabella quality check con filtri data, badge conformità, export
- I piani Trial non possono esportare → messaggio upgrade

#### `/dashboard/notifications` — Notifiche
- **4 tab filtro**: Tutte | Non lette | Critiche | Warning
- Lista notifiche con: icona severity (giallo/rosso), titolo, messaggio, timestamp relativo, link diretto al serbatoio coinvolto
- Azioni per notifica: segna come letta, elimina (admin only)
- Pulsante "Segna tutte come lette"

#### `/dashboard/users` — Gestione Team
- Tabella utenti azienda: nome, email, ruolo, stato (attivo/sospeso), data creazione
- Azioni admin inline:
  - Cambio ruolo (select operator/admin)
  - Sospendi / Riattiva toggle
  - Elimina (con modal conferma)
- Pulsante "Invita Utente" → `InviteUserModal`
- **`InviteUserModal`**: email destinatario, ruolo assegnato, genera link copiabile (7 giorni)

#### `/dashboard/settings` — Impostazioni Azienda
- **3 tab**:
  - **Generale**: nome azienda, upload logo (drag & drop o click, preview immediata, max 2 MB, PNG/JPG/SVG/WebP), selezione colore primario (16 preset + input hex + color swatch nativo), colore secondario; preview live sidebar a destra
  - **Basi**: CRUD basi completo integrato (stessa funzionalità di /dashboard/bases)
  - **Piano**: piano attuale con feature flags (esportazione PDF/Excel, import, max utenti/tank/veicoli), barre utilizzo (usati / limite), countdown trial se applicabile

#### `/dashboard/profile` — Profilo Personale
- **2 sezioni**:
  - Informazioni: nome, cognome, email (non modificabile), lingua UI (select IT/EN/TR/ES)
  - Sicurezza: form cambio password (password attuale, nuova, conferma)

#### `/dashboard/audit` — Audit Log (solo admin)
- Tabella paginata (25 righe/pagina) di tutte le azioni registrate
- **4 filtri**: tipo entità (dropdown dinamico), azione (testo ILIKE), data_from, data_to, utente
- Colonne: timestamp, utente (nome), azione (badge colorato per tipo), entità, ID entità, metadata (JSON inline), IP
- Pulsante "Aggiorna" per refresh manuale
- Non modificabile, non eliminabile

---

### Portale SuperAdmin

Layout separato (`SuperAdminLayout`), accessibile solo a `role = superadmin`.

#### `/superadmin` — Dashboard SuperAdmin
- **Stat cards**: MRR stimato (somma price_monthly * aziende active), totale operazioni globali, litri totali globali
- **Breakdown stato aziende**: barre proporzionali trial / active / suspended / cancelled con conteggi
- **Distribuzione piani**: per ogni piano, quante aziende e revenue mensile

#### `/superadmin/companies` — Gestione Aziende
- Tabella paginata (15 righe/pagina): nome azienda, slug, piano, stato, data creazione, n. utenti, n. operazioni, ultima operazione
- **Ricerca** per nome, **filtro** per stato
- Click su azienda → modal gestione:
  - Metriche: totale ops, litri, serbatoi, utenti, ultima operazione
  - Cambio piano (select)
  - Cambio stato (trial/active/suspended/cancelled)
  - Salva modifiche

#### `/superadmin/plans` — Gestione Piani
- Revenue card totale MRR e ARPU
- Per ogni piano (Trial, Basic, Pro, Enterprise): n. aziende, revenue mensile, barra quota percentuale

---

## 6. Requisiti Tecnici / Tech Stack

### Stack attuale (implementato)

| Layer | Tecnologia | Note |
|---|---|---|
| **Frontend framework** | React 18 + Vite | SPA con routing client-side |
| **Routing** | React Router v6 | Protected routes per ruolo |
| **Styling** | Tailwind CSS v3 | Utility-first, responsive mobile-first |
| **Icone** | Lucide React | Coerenti, tree-shakeable |
| **i18n** | react-i18next | 4 lingue (IT/EN/TR/ES), lazy loading locales |
| **HTTP client** | Axios (via api/index.js) | Interceptor per JWT header automatico |
| **Backend** | Node.js 20 + Express 5 | ESModules (type: module) |
| **Database** | PostgreSQL 15+ | Multi-tenant con company_id su ogni tabella |
| **ORM / Query** | pg (node-postgres) | Query parametrizzate dirette, no ORM |
| **Autenticazione** | JWT (jsonwebtoken) | Token nel localStorage; middleware verifyToken + requireRole |
| **Password** | bcryptjs | Salt rounds 10 |
| **Export PDF** | pdfkit | Generazione server-side, stream al client |
| **Export Excel** | exceljs | Workbook server-side, download diretto |
| **Upload file** | multer | Logo azienda, limite 2 MB, storage locale /uploads |
| **PWA** | Web App Manifest + Service Worker manuale | Cache-first per asset statici, network-first per /api |
| **CORS** | cors npm | Origin da env CLIENT_URL |

### Struttura directory

```
/
├── client/                    # React app (Vite)
│   ├── public/
│   │   ├── manifest.json      # PWA manifest
│   │   ├── sw.js              # Service Worker
│   │   └── icon-{192,512}.svg # Icone PWA
│   └── src/
│       ├── api/               # Axios client per ogni entità
│       ├── components/        # UI components (Button, Card, Modal, etc.)
│       ├── contexts/          # AuthContext, NotificationsContext
│       ├── hooks/             # useAuth
│       ├── i18n/locales/      # it.json, en.json, tr.json, es.json
│       └── pages/             # Struttura per ruolo/feature
│           ├── auth/
│           ├── company/       # Dashboard, tanks, aircraft, vehicles, operations...
│           ├── superadmin/
│           └── invite/
└── server/                    # Express API
    ├── config/db.js           # pg Pool
    ├── middleware/            # auth.js, errorHandler.js
    ├── models/schema.sql      # DDL completo
    ├── routes/                # Un file per entità
    └── utils/                 # auditLog.js, tankAlerts.js
```

### Database — Tabelle principali

| Tabella | Scopo | Chiave multi-tenant |
|---|---|---|
| `subscription_plans` | Piani SaaS (Trial/Basic/Pro/Enterprise) | — |
| `companies` | Aziende clienti con brand e piano | — |
| `users` | Utenti con ruolo (superadmin/admin/operator) | `company_id` |
| `bases` | Basi operative geografiche | `company_id` |
| `tanks` | Serbatoi fissi e mobili | `company_id`, `base_id` |
| `aircraft` | Aeromobili | `company_id` |
| `ground_vehicles` | Veicoli terrestri | `company_id` |
| `fueling_operations` | Log di ogni rifornimento | `company_id` |
| `tank_loads` | Rifornimenti serbatoio da fornitore | `company_id`, `tank_id` |
| `quality_checks` | Spurghi e controlli qualità | `company_id` |
| `invitation_tokens` | Token invito utente (7 giorni) | `company_id` |
| `notifications` | Alert soglia serbatoio | `company_id` |
| `audit_logs` | Log immutabile azioni critiche | `company_id` |

### Variabili d'ambiente richieste

```env
# Server
DATABASE_URL=postgresql://user:pass@host:5432/fuelmanager
JWT_SECRET=stringa-casuale-256-bit
PORT=3001
CLIENT_URL=http://localhost:5173

# Opzionali (per email, da implementare)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@fuelmanager.app
```

### Configurazione raccomandata per produzione

- **Reverse proxy:** Nginx → Express (porta 3001) + serve build Vite da /dist
- **Process manager:** PM2 con restart automatico
- **SSL:** Certbot / Let's Encrypt
- **Database:** PostgreSQL su istanza separata o managed (Supabase, RDS, Neon)
- **Upload file:** Da migrare su S3 / Cloudflare R2 prima di scalare (attualmente storage locale)
- **Session JWT:** Da aggiungere refresh token prima del deploy produzione

---

## 7. Metriche di Successo

### Metriche di adozione

| Metrica | Come si misura | Target a 6 mesi |
|---|---|---|
| **Trial to paid conversion** | (aziende active / aziende totali uscite da trial) × 100 | > 20% |
| **Time to first operation** | Tempo dal register all'inserimento della prima fueling operation | < 15 minuti |
| **Operazioni per azienda / mese** | Media `COUNT(fueling_operations)` per company | > 30 (indica uso continuativo) |
| **DAU/MAU ratio** | Utenti attivi giorno / attivi mese | > 0.3 (prodotto sticky) |
| **Retention a 90 giorni** | % aziende con almeno 1 operazione nei 90 giorni successivi al register | > 60% |

### Metriche di prodotto (UX)

| Metrica | Come si misura | Target |
|---|---|---|
| **Tempo medio per inserire un'operazione** | Timestamp apertura modal → risposta API 201 | < 45 secondi |
| **Tasso errori validazione** | 400 risposte da POST /fueling-operations / totale POST | < 5% (indica form intuitivo) |
| **% utenti che usano export** | Richieste /reports/export / totale sessioni mensili | > 30% (indica valore percepito) |
| **Alert soglia mai visti** | Notifiche con is_read=false > 48 ore / totale notifiche | < 10% (utenti leggono gli alert) |

### Metriche di business

| Metrica | Come si misura | Target a 12 mesi |
|---|---|---|
| **MRR** | Visibile nel pannello superadmin `/superadmin` | > €5.000 |
| **ARPU** | MRR / aziende active | > €80 (indica buona distribuzione verso piani a pagamento) |
| **Churn mensile** | Aziende passate a "cancelled" / aziende active inizio mese | < 3% |
| **Piani Enterprise** | Numero aziende sul piano Enterprise | > 3 a 12 mesi |

### Indicatori qualitativi (da misurare con feedback utenti)

- Gli operatori di campo riescono a registrare un rifornimento **senza guardare un manuale**.
- Il responsabile operativo riesce a **generare il report mensile ENAC in meno di 2 minuti**.
- **Zero incidenti di tipo carburante errato** nei clienti che usano il sistema (il blocco validazione funziona).
- Nessuna perdita di dati: ogni operazione deve essere tracciabile nell'audit log a distanza di anni.

---

*Fine documento — aggiornare a ogni nuova fase implementata.*
