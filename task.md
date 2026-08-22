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
