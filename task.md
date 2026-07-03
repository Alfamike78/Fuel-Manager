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
- superadmin panel NON portato su mobile (resta solo web, per ora)
