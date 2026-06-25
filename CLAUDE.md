# ZOUNDLIST — CLAUDE CODE INSTRUCTIONS

## Project identity
- **Project name:** zoundlist-web
- **Brand name in UI:** Zoundlist (migration from "Sonoris" completed June 2026)
- **Operating company:** JM Creativos LLC (Puerto Rico)
- **Logo assets:** `public/zoundlist-wordmark.png` (white wordmark, used in headers via
  `components/brand.tsx`) · `public/zoundlist-icon*.png` (Z isotipo) · `app/icon.png` (favicon).
- **Brand colors:** black `#000000` · white `#FFFFFF` · neon green `#95F908` (accent).
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
Premium editorial dark system (redesigned June 2026).
- --bg: #0D0D0D (background) · --surface: #171717 · --border: rgba(255,255,255,0.08)
- --text: #FFFFFF · --text-2: rgba(255,255,255,0.65) · --text-3: rgba(255,255,255,0.42)
- Brand accent — `--brand: #95F908` (neon green) with `--brand-ink: #0A0A0A` (text/icon on green).
  Primary & lime buttons are flat green with black text. Legacy `--purple`/`--lime` vars are
  aliases that now point to the brand green (kept so older inline styles stay on-brand).
- `--orange: #FF7A45` is reserved for errors/warnings only — not a brand accent.
- Component layer lives in globals.css with `.zl-*` classes (hover/motion states). Prefer
  these classes over inline styles when an interaction/hover is needed.
- Type: Satoshi (Fontshare). Editorial scale: `.zl-display`, `.zl-h2`, `.zl-eyebrow`.
- Cover art: gradient-mesh palette in `lib/catalog/covers.ts` (green/teal/mint + cool darks).

## Brand (migration completed June 2026)
"Sonoris" → "Zoundlist" is DONE across UI, metadata, certificate prefix (ZND-), logo and favicon.
Legal docs use placeholders centralized in `lib/legal/config.ts`. Use `components/brand.tsx`
for the wordmark lockup in any new header/footer.

## DO NOT
- Add mobile app configuration
- Add Capacitor
- Add Universal Links / App Links
- Add apple-app-site-association
- Add assetlinks.json
- Hardcode zoundlist.com URLs — use NEXT_PUBLIC_APP_URL env var

## Current state (June 2026)
- Landing page: complete (translated from HTML prototype)
- Domain: connected to Vercel (zoundlist.com)
- Auth: not yet integrated
- Payments: not yet integrated
- Catalog from DB: not yet integrated (using mock data)
