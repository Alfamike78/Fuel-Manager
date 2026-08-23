# PilotCraft SaaS — Fase 3: App Mobile Expo

## Obiettivo
Mirror mobile della web app: login/registrazione, dashboard (cisterne+flotta+alert),
storico movimenti, drain check log, profilo/logout. Riusa lo stesso backend Hono.

## Stato: COMPLETATO
- [x] Auth: better-auth bearer() + expo() plugin lato server (web/src/api/auth.ts)
- [x] mobile/lib/auth.ts — authClient con SecureStore/localStorage fallback, captureToken, impersonation helpers
- [x] mobile/lib/api.ts — typed hc client + get/post/patch/del helpers con bearer + X-Company-Id
- [x] mobile/lib/theme.ts — palette navy/sabbia condivisa
- [x] app/_layout.tsx — AuthGate con redirect automatico (auth)/(tabs)
- [x] app/(auth)/sign-in.tsx — login + registrazione (company create->signup->link)
- [x] app/(tabs)/_layout.tsx — tab bar Dashboard/Storico/Drain Check/Profilo
- [x] app/(tabs)/index.tsx — dashboard con cisterne, flotta, alert, nuovo movimento modal, drain check modal
- [x] app/(tabs)/history.tsx — storico movimenti + stats
- [x] app/(tabs)/drainlog.tsx — drain check log
- [x] app/(tabs)/profile.tsx — profilo utente + logout
- [x] app.json aggiornato (nome, bundle id, scheme, dark mode)
- [x] TS clean per file mobile (app/lib/components) — errori residui sono cross-package drizzle-orm
      duplicate instance quirk pre-esistente in web/src/api/routes/*.ts, non bloccante runtime
- [x] Web app rebuilt + pm2 riavviato, verificato 200 OK + login funzionante

## Note tecniche
- Non implementato: notifiche push native, offline mode, foto upload drain check su mobile (da fase 4 se richiesto)
- baseUrl mobile letto da app.json expo.extra.apiUrl (preview URL)
- Super Admin CRM PORTATO su mobile [date: 2026-07-03]: app/(superadmin)/index.tsx + _layout.tsx.
  Route gate in app/_layout.tsx: se role=superadmin e non impersonating -> forza su (superadmin);
  altrimenti (operator/admin o superadmin impersonando) -> (tabs). Pulsante ESCI in (tabs)/index.tsx
  banner impersonation ora fa clearImpersonation + redirect a (superadmin).
  Feature complete: lista aziende (attive/archivio), ricerca, crea azienda, modifica azienda,
  gestione abbonamento (piano/stato/estendi trial), sospendi/riattiva, archivia/elimina definitivamente
  con conferma password. Stesso backend /api/superadmin/* del web, nessuna modifica lato server necessaria.

---

# Fase 4 — Parità mobile: multilingua (6 lingue) + Analytics [date: 2026-08-22]

## Stato: COMPLETATO
### Multilingua mobile
- [x] packages/mobile/i18n/translations.ts — 6 lingue (IT/EN/FR/DE/ES/TR), ~110 chiavi
      (chiavi web + chiavi specifiche mobile: tabs, impersonation, analytics, KPI)
- [x] packages/mobile/lib/lang.ts — store globale + useLang() hook + tr() per uso fuori React.
      Persistenza SecureStore (native) / localStorage (web), fallback su lingua device, default IT.
      Fallback traduzione: lingua scelta -> italiano -> chiave.
- [x] packages/mobile/components/LanguageSelector.tsx — chip bandiera+nome, prop `compact` (solo bandiera)
- [x] Applicato a: (tabs)/_layout.tsx (titoli tab), (auth)/sign-in.tsx (+ selector in alto a destra),
      (tabs)/index.tsx (+ selector compatto in header), history.tsx, drainlog.tsx,
      profile.tsx (+ blocco "🌐 Lingua" con selector completo)
- [x] Modali fuori dal componente root (NewMovementModal/DrainCheckModal) usano tr() invece di useLang()

### Tab Analytics mobile
- [x] packages/mobile/app/(tabs)/analytics.tsx — nuova tab 📈 tra Storico e Drain Check
- [x] 4 KPI: rifornimenti tot, consumi tot, bilancio, media giornaliera
- [x] Grafico barre raggruppate rifornimenti vs consumi, switch periodo 14g / 30g
- [x] Barre orizzontali litri per cisterna (ordinate desc)
- [x] Barra impilata + legenda % per tipologia movimento
- [x] Card "mezzo più rifornito"
- [x] Pull-to-refresh, stato vuoto tradotto
- [x] ZERO nuove dipendenze: grafici costruiti con View/flex (recharts non funziona in React Native)

## Verifiche
- [x] tsc mobile pulito (solo residuo drizzle-orm cross-package in web/src/api, pre-esistente)
- [x] Bundle Metro compilato: HTTP 200, 4.28 MB
- [x] Web 4200 e Metro 4300 attivi

## Note
- Le stringhe del CRM superadmin mobile ((superadmin)/index.tsx) restano in italiano:
  è un pannello interno usato solo dal super admin. Da tradurre solo se richiesto.

---

# Fix bug trovati durante il test sul telefono [date: 2026-08-22]

## 1. Login 403 INVALID_ORIGIN — commit 27108ef
- Causa: WEBSITE_URL in .env finisce con slash → better-auth lo usava come baseURL e la
  validazione origin falliva PRIMA del controllo password. Sul mobile anche apiUrl diventava
  ".../site//api/...".
- Fix: baseURL normalizzato con .replace(/\/+$/, "") in packages/web/src/api/auth.ts,
  trustedOrigins in forma dinamica; stessa normalizzazione in mobile/lib/api.ts e mobile/lib/auth.ts.
- app.json (expo.extra) NON toccato: gestito dalla piattaforma.
- Verificato: login 200 con token senza Origin, con Origin preview-4300, con expo-origin.

## 2. Crash mobile dopo login superadmin — commit fadf4cc
- Causa: get() in mobile/lib/api.ts faceva r.json() anche sugli errori → un 401 restituiva
  un oggetto e companies.filter() crashava in (superadmin)/index.tsx.
- Fix: get() controlla r.ok e lancia col messaggio del server (protegge tutte le schermate);
  coercizione difensiva ad array + guardia su c.name.

## 3. Registrazione "Cannot determine default value of object" — commit 376f95a
- Causa: additionalFields.companyId senza defaultValue né required:false → il client better-auth
  lo considerava obbligatorio per il sign-up e lanciava prima di inviare la richiesta
  (per questo i test curl passavano).
- Fix: role e companyId ora `required: false, input: false` (sono sempre impostati lato server
  via /api/companies/link o update DB diretto).
- Verificato: tsc pulito sul vincolo companyId + E2E dei 3 step di registrazione
  (azienda creata → sign-up → link 200 → ruolo admin con companyId corretto).

---

# Fase 5 — Pannello Admin su mobile (parità con tab Config del web) [date: 2026-08-22]

## Stato: COMPLETATO
- [x] packages/mobile/lib/fuel-types.ts — mirror di web/lib/fuel-types.ts (FUEL_TYPES, getFuelColor,
      AVIATION_TYPES, GROUND_TYPES). Tenere allineati i due file.
- [x] packages/mobile/app/(tabs)/admin.tsx — nuova tab ⚙️ Configurazione con 4 accordion:
      📍 Basi, 🛢️ Cisterne, 🚁 Flotta, 👥 Utenti. CRUD completo (crea/modifica/elimina) con
      conferma nativa su delete, pull-to-refresh, contatore elementi per sezione.
- [x] TankModal: nome, capacità, livello attuale, tipo carburante (chip colorati), soglia allarme,
      base. Il tipo carburante su cisterna ESISTENTE è in sola lettura per admin (🔒 + spiegazione):
      rispetta la regola backend che lo consente solo al superadmin.
- [x] VehicleModal: categoria ✈️ Aviazione / 🚜 Terrestre, tipo (chip da AVIATION_TYPES/GROUND_TYPES),
      campo "Specifica tipo" se Altro, nome, targa/identificativo, modello (solo aviazione), capacità.
- [x] BaseModal: nome + località.
- [x] Sezione Utenti: lista con badge ruolo + box invito (email + ruolo operator/admin) che mostra
      il link di invito selezionabile da copiare.
- [x] Gating ruoli: tab nascosta agli operatori (href: null in (tabs)/_layout.tsx) + schermata 🔒
      "solo admin" come doppia sicurezza. Il backend resta la difesa vera (requireAdmin → 403).
- [x] i18n: ~24 nuove chiavi aggiunte in tutte e 6 le lingue (config, addTank, addVehicle, addBase,
      alertThreshold, category, aviation, ground, specifyType, invite, adminOnly, fuelTypeLocked, ...)
- [x] Zero nuove dipendenze. Nessuna modifica al backend: riusa /api/bases, /api/tanks,
      /api/helicopters, /api/companies/me/users, /api/companies/me/invite.

## Verifiche
- [x] tsc mobile pulito (filtro grep -v "web/src/api")
- [x] Bundle Metro iOS: HTTP 200, 7.06 MB, nessun errore runtime nei log tmux

## Gap residui verso la parità totale col web (da fare nelle fasi successive)
- Branding/Aspetto (nome brand + colori) — presente solo sul web
- Import movimenti da Excel — presente solo sul web
- Export PDF/CSV di movimenti e drain check — presente solo sul web
- Modifica/elimina movimenti dallo storico (admin) — presente solo sul web
- Onboarding wizard 4 step — presente solo sul web
- Upload foto sul drain check — non presente da nessuna parte (colonna DB esiste)

---

# Fase 6 (1/6 della parità totale) — Export PDF/Excel su mobile [date: 2026-08-22]

## Stato: COMPLETATO
### Backend (nuovo)
- [x] packages/web/src/api/routes/reports.ts — generazione server-side, registrato in index.ts come /api/reports
      - POST /api/reports/movements  body {format:"pdf"|"xlsx", from?, to?, ids?[]} -> {filename, mime, base64, count}
      - POST /api/reports/drain-checks — stesso contratto
      - PDF con jsPDF + autotable: header navy/sabbia, nome azienda (brandName), periodo, totali
        (rifornimenti/consumi/spurghi/n. movimenti), tabella con operatore risolto da user.name
      - Drain check PDF: esiti diversi da "Regolare" evidenziati in rosso grassetto
      - XLSX con SheetIO: foglio dati + foglio "Riepilogo", larghezze colonne impostate
      - 404 con messaggio chiaro se non ci sono righe nel periodo
      - Multi-tenant: filtra sempre per company_id via getCompanyId (impersonation superadmin inclusa)
- [x] SCELTA: POST e non GET. Le selezioni lunghe in query-string rompono su iOS
      ("string did not match the expected pattern") — stesso bug già visto su Helijet.

### Mobile
- [x] Dipendenze aggiunte: expo-file-system@19.0.24, expo-sharing@14.0.8
- [x] packages/mobile/lib/download.ts — downloadReport(kind, body): chiama il backend, decodifica
      base64, scrive il file e apre il foglio di condivisione (Sharing.shareAsync).
      Su web fa fallback a download via Blob + <a download>. Helper lastDays(n).
      Import da "expo-file-system/legacy" (l'API nuova SDK 54 non serve qui).
- [x] packages/mobile/components/ExportBox.tsx — accordion "📄 SCARICA REPORT":
      periodi rapidi 7/30/90/Tutto + intervallo custom (da/a), pulsanti 📄 PDF e 📊 Excel
      con spinner, alert di conferma con nome file.
- [x] Montato in (tabs)/history.tsx (movimenti) e (tabs)/drainlog.tsx (drain check)
- [x] i18n: 12 nuove chiavi x 6 lingue (downloadReport, period, last7/30/90, allTime,
      customRange, fromDate, toDate, downloading, savedFile, noRowsInPeriod)

## Verifiche
- [x] Endpoint testati con token reale (testadmin@test.com): movements pdf/xlsx e
      drain-checks pdf/xlsx tutti 200 con base64 valido (PDF "JVBERi", XLSX "UEsDBBQ")
- [x] Build web ok + pm2 restart, web 200
- [x] tsc mobile pulito, bundle Metro iOS 200 (7.13 MB), nessun errore runtime

## Nota per il test sul telefono
Su iOS il file passa dal foglio di condivisione: "Salva su File" per metterlo in Files,
oppure invialo direttamente via Mail/WhatsApp. Su Android si apre il selettore app/cartella.

## Restano 5 punti per la parità totale
2. Modifica/elimina movimenti dallo storico mobile (admin)
3. Branding (nome brand + colori) da mobile
4. Import movimenti da Excel da mobile
5. Onboarding wizard 4 step su mobile
6. Upload foto sul drain check (manca anche sul web; colonna photoUrl già in DB)

# FASE 7 — Parità mobile 2/6: modifica/elimina movimenti dallo storico
Data: 2026-08-22

## Backend
- [x] `PATCH /api/movements/:id` (requireAdmin) in `packages/web/src/api/routes/movements.ts`
      Campi editabili: liters, date, time, notes.
      Ricalcolo livelli cisterna dal delta litri: segno + per refuel, - per consumo,
      su transfer aggiorna anche toTankId. Clamp 0..capacity.
      Errori: 404 "Movimento non trovato", 400 "Litri non validi".
- [x] Testato live: PATCH su movimento reale, litri 5 → 150, livello cisterna ricalcolato ok.

## Mobile
- [x] `packages/mobile/app/(tabs)/history.tsx` riscritto: admin/superadmin vedono ✏️ e 🗑️
      su ogni riga movimento.
- [x] `EditMovementModal`: litri, data YYYY-MM-DD, ora HH:MM, note, con validazione regex.
- [x] 🗑️ con conferma nativa (testo `deleteMovementWarning`).
- [x] Invalidazione query ["movements"] + ["tanks"] dopo save/delete.
- [x] Array.isArray difensivo su movements + tanks incluse nel pull-to-refresh.
- [x] i18n: `deleteMovementWarning`, `editMovementHint` x 6 lingue.

## Verifiche
- [x] Build web ok + pm2 restart web-app, web 200
- [x] tsc mobile pulito (filtro web/src/api)
- [x] Bundle Metro iOS 200 (7.14 MB), nessun errore runtime nei log

## Restano 4 punti per la parità totale
3. Branding (nome brand + colori) da mobile
4. Import movimenti da Excel da mobile
5. Onboarding wizard 4 step su mobile
6. Upload foto sul drain check (manca anche sul web; colonna photoUrl già in DB)

# FIX CRITICO — Compatibilità carburante mezzo ↔ cisterna
Data: 2026-08-23

## Problema segnalato
Era possibile registrare un rifornimento da una cisterna Diesel verso un elicottero
Jet-A1: il movimento veniva accettato. Causa radice: la tabella `helicopters` NON
aveva alcun campo `fuel_type`, quindi nessun controllo era possibile.

## Schema
- [x] `helicopters.fuelType` (text, nullable) aggiunto in `schema.ts` + `db:push` applicato.

## Backend
- [x] `routes/helicopters.ts`: POST accetta `fuelType`; PATCH lo accetta ma se il mezzo
      ha GIÀ un carburante assegnato solo il superadmin può cambiarlo (403), stessa
      regola già attiva sulle cisterne.
- [x] `routes/movements.ts` POST: se il movimento ha `helicopterId` + `tankId`
      - mezzo senza carburante assegnato → 400 `VEHICLE_FUEL_NOT_SET`
      - carburante mezzo ≠ carburante cisterna → 400 `FUEL_MISMATCH` con messaggio
        esplicito (mezzo, carburante richiesto, cisterna, carburante contenuto)
- [x] Resta attivo il blocco già esistente sui transfer tra cisterne di carburante diverso.

## Web (dashboard.tsx)
- [x] `VehicleModal`: selettore Tipo Carburante obbligatorio (chips colorate),
      lucchetto 🔒 se già assegnato e utente non superadmin.
- [x] `NewMovementModal`: la tendina Mezzo mostra SOLO i mezzi compatibili col
      carburante della cisterna scelta, con contatore dei mezzi nascosti; il mezzo
      selezionato si azzera se cambio cisterna; guardia client-side prima del submit.
- [x] i18n: 6 nuove chiavi x 6 lingue.

## Mobile
- [x] `(tabs)/admin.tsx` VehicleModal: selettore carburante + lucchetto superadmin;
      badge carburante nella lista Flotta (rosso ⚠︎ se non assegnato).
- [x] `(tabs)/index.tsx` NewMovementModal: chip cisterna con carburante, mezzi
      filtrati per compatibilità, transfer limitato a cisterne dello stesso carburante,
      guardia prima del salvataggio.
- [x] i18n mobile: 6 nuove chiavi x 6 lingue.

## Verifiche live (testadmin@test.com)
- [x] A) mezzo senza carburante → 400 VEHICLE_FUEL_NOT_SET
- [x] B) PATCH assegna Jet-A1 al mezzo → 200
- [x] C/D) elicottero Jet-A1 da cisterna Diesel → 400 FUEL_MISMATCH
- [x] E) Jet-A1 → Jet-A1 → 201 OK
- [x] F) admin che cambia carburante di mezzo esistente → 403
- [x] Build web ok, pm2 restart, web 200, tsc mobile pulito, bundle Metro 200 (7.15 MB)

## ATTENZIONE dati esistenti
I mezzi creati prima di questo fix hanno `fuelType` NULL: vanno aperti una volta in
Flotta e salvati col carburante corretto, altrimenti il rifornimento viene rifiutato
con messaggio esplicito.
