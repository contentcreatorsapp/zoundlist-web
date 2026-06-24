# ZOUNDLIST — CLAUDE CODE INSTRUCTIONS

## Project identity
- **Project name:** zoundlist-web
- **Brand name in UI:** Sonoris (temporary — do NOT replace yet)
- **Production domain:** https://zoundlist.com
- **Platform:** Web-only. No mobile, no Capacitor, no iOS, no Android.

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS (utility classes available but inline styles used in landing)
- Supabase (Auth + PostgreSQL + Storage) — not yet integrated
- Stripe (Subscriptions) — not yet integrated
- Resend (transactional email) — not yet integrated
- Deploy: Vercel

## Repository
- GitHub: https://github.com/jaimejm/zoundlist-web (to be confirmed)
- Branch: main
- CI: Vercel auto-deploys on push to main

## Environment variables (set in Vercel)
- NEXT_PUBLIC_APP_URL=https://zoundlist.com
- NEXT_PUBLIC_APP_NAME=Zoundlist
- NEXT_PUBLIC_SUPABASE_URL= (add when integrating)
- NEXT_PUBLIC_SUPABASE_ANON_KEY= (add when integrating)
- STRIPE_SECRET_KEY= (add when integrating)
- STRIPE_WEBHOOK_SECRET= (add when integrating)
- RESEND_API_KEY= (add when integrating)

## Architecture (service-layer pattern for future mobile)
```
app/              → Next.js routes (UI only)
services/         → Business logic (reusable, no React deps)
lib/              → Third-party clients (supabase, stripe, resend)
components/       → React UI components
  ui/             → Primitives (Button, Card, Badge)
  audio/          → AudioPlayer, Waveform
  catalog/        → TrackCard, TrackGrid, FilterBar
  dashboard/      → DownloadRow, CertificateLink
  layout/         → Navbar, Footer
types/            → TypeScript types shared across layers
public/           → Static assets
  robots.txt      → Configured for zoundlist.com
  og-image.png    → Replace with real 1200x630 before launch
```

## Design tokens (CSS vars in globals.css)
- --void: #080b14 (background)
- --purple: #5723fc (primary brand, shared with Creativus)
- --amber: #f5a623 (accent)
- --text-primary: #e8ecf4

## Brand migration (FUTURE — not now)
When migrating "Sonoris" → "Zoundlist":
1. app/layout.tsx — siteName, title, OG alt
2. app/page.tsx — logo text, footer copyright
3. CLAUDE.md — brand name
4. package.json — name field
5. Certificate prefix: SNR- → ZND- (or decide new prefix)
6. Legal docs — replace [BRAND_NAME] placeholder

## DO NOT
- Add mobile app configuration
- Add Capacitor
- Add Universal Links / App Links
- Add apple-app-site-association
- Add assetlinks.json
- Replace "Sonoris" brand name in UI (migration is a separate task)
- Hardcode zoundlist.com URLs — use NEXT_PUBLIC_APP_URL env var

## Current state (June 2026)
- Landing page: complete (translated from HTML prototype)
- Domain: connected to Vercel (zoundlist.com)
- Auth: not yet integrated
- Payments: not yet integrated
- Catalog from DB: not yet integrated (using mock data)
