# PilotCraft SaaS — Fase 2

## Obiettivo
1. Notifiche/alert in-app (bell dropdown + toast) per livello basso e drain check anomalo
2. Export PDF (report movimenti + drain check log)
3. Analytics avanzate (grafici con recharts): consumi nel tempo, refuel vs consumo per cisterna, breakdown per tipo movimento

## Stato progetto (verificato)
- Core già completo e funzionante: auth, tanks, fleet, movements, drain-check, bases, i18n 6 lingue, superadmin CRM
- TS clean, server online porta 4200, pm2 "web-app"
- Librerie installate: recharts, jspdf, jspdf-autotable
- GitHub: Alfamike78/Fuel-Manager (già pushato, sync)

## Piano implementazione
- [ ] lib/pdf.ts — helper generatePDF report movimenti + drain checks
- [ ] components/NotificationBell.tsx — dropdown con alert attivi + toast per nuovi alert (localStorage per dedup)
- [ ] Nuovo tab "analytics" in dashboard.tsx con 3 grafici recharts
- [ ] Bottoni "Scarica PDF" in ReportView e Drain Check Log tab
- [ ] tsc clean + test manuale + push GitHub

## Note tecniche
- Dashboard.tsx: 1235 righe, tab type = "dashboard"|"history"|"config"|"drainlog"
- lowTanks/alertTanks già calcolati in Dashboard() per banner esistenti — riusare per bell
- movements schema: type refuel|consumption|transfer|drain_check, liters, date, tankId, helicopterId
- brand colors: --pc-primary #1b3a5c, --pc-sand #d6c4a0, --pc-dark #0f1e2e
