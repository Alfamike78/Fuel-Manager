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

# FIX — Eliminazione azienda dal CRM mobile non funzionante
Data: 2026-08-23

## Problema segnalato
Dal CRM super-admin su mobile, il modale "Elimina Azienda" mostrava un riquadro
rosso "Errore" vuoto e non eliminava nulla.

## Causa radice (tre difetti sommati)
1. `packages/mobile/lib/api.ts` → `del()` inviava la richiesta DELETE **senza corpo**.
2. `routes/superadmin.ts` → il DELETE faceva `await c.req.json()` senza catch: con il
   corpo vuoto la route lanciava un'eccezione e rispondeva con un errore non JSON.
3. Il modale mobile leggeva `e.message`, mentre il backend restituisce `{ error }`
   → messaggio vuoto ("Errore" senza testo).
   Inoltre `mode` e `password` non venivano mai inviati: "Elimina definitivamente"
   si comportava comunque come archiviazione.

## Fix
- [x] `lib/api.ts`: `del(path, body?)` con Content-Type JSON e corpo opzionale.
- [x] `(superadmin)/index.tsx`: invia `{ mode, password }`, valida la password prima
      dell'invio in modalità purge, mostra `e.error ?? e.message ?? HTTP <code>`,
      try/catch/finally sul loading, label password dinamica.
- [x] `routes/superadmin.ts` DELETE `/companies/:id`:
      - parse del corpo con `.catch(() => ({}))` (nessun crash su corpo vuoto)
      - 404 "Azienda non trovata" se l'id non esiste
      - purge: password super-admin obbligatoria, verificata con
        `auth.api.signInEmail` → 400 se assente, 401 se errata
      - try/catch globale che restituisce sempre JSON
      - risposta 200 con `{ ok, mode, company }`
- [x] `web/pages/superadmin.tsx`: tutti i messaggi d'errore ora leggono `e.error` prima
      di `e.message` (4 punti).

## Verifiche live (super-admin)
- [x] DELETE senza corpo → 200, archiviazione (prima: errore illeggibile)
- [x] purge con password errata → 401 "Password super-admin errata"
- [x] purge senza password → 400 "Password super-admin obbligatoria..."
- [x] Build web ok, pm2 restart, web 200, tsc mobile pulito, bundle Metro 200

---

# Fase 8 — Drain check su mezzi aerei con foto + firma digitale (2026-08-23)

## Requisiti (da Ago)
- Il drain check, oggi solo sulle cisterne, deve funzionare anche sui **mezzi aerei**
  (elicotteri e aerei), con **registro proprio**.
- Ogni record è **certificato con firma digitale** dell'utente che lo esegue
  (firma tracciata a dito sullo schermo, salvata come immagine allegata).
- Due **foto opzionali**: contalitri + barattolo campione. Se manca almeno una,
  il record è marcato **"incompleto"**.
- Solo mezzi **aviation** (no mezzi terrestri).
- Una volta firmato il record è **immutabile**: un admin può solo **annullarlo
  indicando il motivo**, e resta visibile come annullato (tracciabilità piena).
- Punti di prelievo: Serbatoio principale, Serbatoio ausiliario, Sump / drenaggio
  serbatoio, Sump ala sinistra, Sump ala destra, Filtro carburante / gascolator, Altro.

## DB (db:push applicato)
- `helicopters`: `lastDrainCheckQuality`, `lastDrainCheckDate`.
- `drain_checks`: `targetType` (tank|aircraft), `samplePoint`, `photoCounterKey`,
  `photoSampleKey`, `isIncomplete`, `signatureKey`, `signaturePath`, `signedByName`,
  `signedByEmail`, `signedAt`, `signedDevice`, `integrityHash`, `voidedAt`, `voidedBy`,
  `voidReason`. `photoUrl` legacy mantenuto ma non usato.

## Backend
- NEW `api/lib/s3.ts` — client Tigris S3.
- NEW `api/routes/uploads.ts` — `POST /api/uploads/presign` (upload diretto dal
  device allo storage, key namespacizzata `${companyId}/${folder}/…`, 15 min) e
  `GET /api/uploads/view?key=` (URL di sola lettura 1h, 403 se la key non
  appartiene all'azienda del chiamante).
- `api/routes/drain-checks.ts` riscritta:
  - `GET /?target=tank|aircraft`
  - `POST /` — targetType dedotto dal mezzo; 400 se il mezzo non è aviation;
    aggiorna `helicopters.lastDrainCheck*`; per le cisterne comportamento invariato
    (scala il livello + movimento `drain_check`); `isIncomplete` se manca una foto;
    timbra firmatario/data/device e calcola `integrityHash` (SHA-256 sui campi sigillati)
  - `GET /:id/verify` — ricalcola l'hash e dice se il record è integro
  - `POST /:id/void` (admin) — motivo obbligatorio (min 3 char), pulisce l'allarme sul mezzo
  - `PATCH /:id` e `DELETE /:id` → **403 SIGNED_IMMUTABLE** se il record è firmato

## Mobile
- NEW `lib/upload.ts`, `components/SignaturePad.tsx` (firma a dito con react-native-svg),
  `components/AircraftDrainModal.tsx` (data/ora, punto di prelievo, litri, esito,
  2 foto da fotocamera o galleria, firma obbligatoria, "🔒 Firma e salva").
- `app/(tabs)/drainlog.tsx` riscritta: sub-tab **Cisterne / Mezzi aerei**, pulsante
  "＋ nuovo drain check mezzo" con selezione del mezzo aereo, badge per riga
  (🔒 firmato / ⚠︎ incompleto / ✖ annullato), modale dettaglio con firma renderizzata,
  foto (URL presigned) e azione **Annulla record** per admin.
- `lib/api.ts`: `authHeaders` esportata.
- i18n: 30 chiavi nuove × 6 lingue.

## Web
- NEW `web/lib/upload.ts` (presign + view + pathsToSvg).
- NEW `web/components/DrainAircraft.tsx` — firma con mouse/dito (pointer events),
  `AircraftDrainModal`, `DrainDetailModal`, `DrainPhotos`, `SignatureView`.
- `pages/dashboard.tsx`: pulsante 🔍 su ogni mezzo aereo in flotta, Drain Log con
  icona per tipo, punto di prelievo, badge firmato/incompleto/annullato, riga
  cliccabile → dettaglio con firma + foto + annullamento; il cestino non appare più
  sui record firmati.
- i18n web: 27 chiavi nuove × 6 lingue.

## Verifiche live
- [x] presign 200 + PUT su storage 200 + view 200 (key company-namespaced)
- [x] POST drain check mezzo aereo firmato con 1 foto su 2 → 201, `isIncomplete=1`,
      `signedByName` valorizzato, `targetType=aircraft`
- [x] `GET /:id/verify` → `valid: true`
- [x] PATCH su record firmato → 403 ; DELETE su record firmato → 403
- [x] void senza motivo → 400 ; void con motivo → 200, record resta visibile come annullato
- [x] `bunx tsc --noEmit` pulito su web e mobile, build Vite ok, pm2 restart, web 200,
      bundle Metro 200 (7.65 MB)

## NOTA DB (2026-08-23)
Nel DB restano solo 2 aziende: **ELILOMBARDA** e **Heliavia**. `Test Azienda SRL`
non esiste più e `testadmin@test.com` ha `company_id` NULL (non può più fare login
operativo). Per i test ho creato **Drain Test SRL** (`drainadmin@test.com` /
`TestPass123!`) con un elicottero `I-TEST` Jet-A1.

---

# Fase 9 — Fix allarme "acqua" nel drain check (parità con "impurità")

## Segnalazione di Ago
"Quando segnalo la presenza di acqua non mi mette l'allarme, lo mette solo con
le impurità — vorrei che anche se si registra l'acqua nel drain check faccia
la stessa cosa che con le impurità."

## Causa
- Le **cisterne** trattavano già acqua e impurità in modo identico
  (`hasAlert = quality && quality !== "ok"`) su web e mobile: nessun bug qui.
- I **mezzi aerei** (introdotti in Fase 8) scrivevano `lastDrainCheckQuality`
  a DB ma **nessuna UI lo leggeva**: zero banner, zero indicatore in flotta,
  per acqua E impurità. Questo è il buco reale.
- In più, nel Drain Check Log lo stato "Acqua" usava un badge blu (colore
  non-allarmante) invece del rosso usato per "Impurità" — contribuiva
  all'impressione che l'acqua non fosse trattata come anomalia.

## Fix
- **Web** (`pages/dashboard.tsx`): aggiunto `alertAircraft`, esteso il banner
  rosso in cima e le notifiche a campanella per includere i mezzi aerei,
  aggiunta la scritta rossa "🔴 Drain check: ..." (o verde ✅ se OK) sotto
  ogni card della flotta — stesso pattern già usato per le cisterne.
  Badge nel Drain Check Log: "Acqua" ora usa la stessa classe rossa
  `badge-impurities` di "Impurità".
- **Mobile** (`app/(tabs)/index.tsx`): stesso fix — banner rosso e riga
  rossa/verde sotto ogni card della flotta. (`app/(tabs)/drainlog.tsx`):
  `QUALITY_COLOR.water` passato da blu a rosso.
- Lasciati intenzionalmente blu i **pulsanti di selezione esito** nei modali
  di creazione drain check (sono un input, non un allarme) — da rivedere se
  Ago segnala ancora percezione di disparità dopo questo fix.

## Verifiche live
- [x] `bunx tsc --noEmit` pulito su web e mobile
- [x] build Vite ok, pm2 restart, web 200
- [x] Creata azienda di test temporanea, mezzo aereo `I-TEST` e cisterna
      `Test Tank`: POST drain check `quality: "water"` su entrambi →
      `lastDrainCheckQuality: "water"` a DB
- [x] Screenshot dashboard: banner rosso "Anomalia carburante: Test Tank
      (water), I-TEST (water)" + card cisterna e card flotta entrambe con
      riga rossa "🔴 Drain check: water"
- [x] Screenshot Drain Check Log: badge "Acqua" rosso (stesso stile di
      "Impurità")
- [x] Bundle Metro mobile 200, nessun errore runtime in console
- [x] Dati di test rimossi dal DB dopo la verifica

---

# Fase 10 — Unificazione configurazione drain check cisterna = mezzo aereo

## Richiesta di Ago (verbatim)
"quando faccio il drain chek alla cisterna non c'è la stessa configurazione
del mezzo aereo, non posso fare un repor se c'è presenza di acqua o
impurita avrei bisogno della stessa configurazonie e che facesse lo stesso
con gli allarmi."

## Causa
- Il backend (`api/routes/drain-checks.ts`) era **già generico**: accetta
  `samplePoint`, foto, firma, immutabilità/void identici sia per `tankId`
  che per `helicopterId`. Nessun bug lato server.
- Il buco era solo **UI**: le cisterne usavano ancora il vecchio modale
  semplice (`DrainCheckModal`: solo esito/litri/note), mentre i mezzi aerei
  usavano il modale ricco (`AircraftDrainModal`: punto di prelievo, 2 foto,
  firma digitale, record firmato immutabile).

## Fix
- **Web** (`components/DrainAircraft.tsx`): `AircraftDrainModal` generalizzato
  per accettare sia `tank` che `aircraft`; invia `tankId` o `helicopterId`
  a seconda del target; titolo/etichette si adattano.
- **Web** (`pages/dashboard.tsx`): rimosso il vecchio `DrainCheckModal`
  semplice e il suo handler; il pulsante 🔍 sulla cisterna ora apre
  `AircraftDrainModal` con `tank={selected}`.
- **Mobile** (`components/AircraftDrainModal.tsx`): stessa generalizzazione
  (`tank`/`aircraft`, `targetLabel`, `tankId`/`helicopterId` nel submit).
- **Mobile** (`app/(tabs)/index.tsx`): rimosso il vecchio `DrainCheckModal`
  semplice; il pulsante 🔍 sulla cisterna ora apre `AircraftDrainModal`.
- Lasciati intenzionalmente blu i pulsanti di selezione esito (input, non
  allarme) — ora condivisi da cisterne e mezzi aerei nello stesso modale.

## Verifiche live
- [x] `bunx tsc --noEmit` pulito su web e mobile
- [x] build Vite ok, pm2 restart, web 200
- [x] Creata azienda/cisterna di test temporanea: screenshot modale cisterna
      → punto di prelievo, litri, esito, 2 foto (con avviso "record
      incompleto" se mancanti), firma digitale — identico al modale mezzi
      aerei
- [x] POST drain check via curl con `tankId` + `samplePoint` + firma → 201,
      stessa forma di risposta (`isIncomplete`, `integrityHash`,
      `targetType: "tank"`) dei mezzi aerei
- [x] Screenshot Drain Check Log: riga cisterna con punto di prelievo,
      badge 🔒 Firmato, ⚠ Incompleto, esito rosso, stessa UI dei mezzi aerei
- [x] Screenshot dettaglio record: firma SVG, "Firmato da", pulsante
      "✖ Annulla record" — parità piena col dettaglio mezzo aereo
- [x] Bundle Metro mobile 200, nessun errore runtime in console (verifica
      solo su bundle/log, non testato a tocco su dispositivo/simulatore)
- [x] Dati di test rimossi dal DB dopo la verifica
- [x] Commit e push su GitHub (`82480f9`)
- [ ] Riscontro di Ago non ancora arrivato (né su questo fix né sul
      precedente fix allarme acqua/impurità)

## Nota per il report/export
`lib/pdf.ts` (`exportDrainChecksPDF`) e `dashboard.tsx`
(`exportDrainCSV`) erano **già generici** su cisterne e mezzi aerei prima
di questa modifica — nessuna modifica necessaria lì. Il record firmato
prodotto ora dalla cisterna è già esportabile come report PDF/CSV dalla
pagina Drain Check Log, esattamente come per i mezzi aerei.

---

# Fase 11 — Punto di prelievo: menu a tendina, liste distinte cisterna/mezzo aereo

## Richiesta di Ago (verbatim)
"nel layout del drain chek potresti fare un menu a tendina nel punto di
prelievo? e lasciare solo filtro, drenaggio, cisterna, per le cisterne
mentre tutto il resto per i mezzi aerei?"

## Fix
- Il campo "Punto di prelievo", finora una fila di pulsanti/chip, è ora un
  vero menu a tendina (`<select>` su web, dropdown custom su mobile).
- Le opzioni dipendono dal target:
  - **Cisterna:** Filtro, Drenaggio, Cisterna (3 opzioni, nessuna "Altro").
  - **Mezzo aereo:** lista invariata di prima (Serbatoio principale,
    Serbatoio ausiliario, Sump/drenaggio serbatoio, Sump ala sinistra,
    Sump ala destra, Filtro carburante/gascolator, Altro).
- **Web** (`components/DrainAircraft.tsx`): `TANK_SAMPLE_POINTS` e
  `AIRCRAFT_SAMPLE_POINTS` separati, select nativo che sceglie la lista in
  base a `isTank`.
- **Mobile** (`components/AircraftDrainModal.tsx`): stesse due liste;
  dropdown custom (pulsante con valore corrente + freccia, lista a
  comparsa sotto) al posto delle chip, dato che RN non ha `<select>`
  nativo.

## Verifiche live
- [x] `bunx tsc --noEmit` pulito su web e mobile
- [x] build Vite ok, pm2 restart, web 200
- [x] Creata azienda di test temporanea con 1 cisterna + 1 mezzo aereo:
      screenshot modale cisterna → tendina con solo "Filtro / Drenaggio /
      Cisterna"; screenshot modale mezzo aereo → tendina con le 7 opzioni
      originali (verificato anche via query DOM sulle `<option>`)
- [x] Bundle Metro mobile 200, nessun errore runtime nei log (solo
      verifica bundle/log, non testato a tocco su dispositivo)
- [x] Dati di test rimossi dal DB dopo la verifica
