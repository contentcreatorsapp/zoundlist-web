# zoundlist-web

AI-curated music library for content creators — [zoundlist.com](https://zoundlist.com)

**Brand name in UI:** Sonoris (temporary, migration pending)  
**Platform:** Web-only (Next.js)  
**Domain:** zoundlist.com

## Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** CSS custom properties + Tailwind utilities
- **Auth/DB:** Supabase (to be integrated)
- **Payments:** Stripe (to be integrated)
- **Email:** Resend (to be integrated)
- **Deploy:** Vercel

## Getting started

```bash
npm install
cp .env.example .env.local
# Fill in .env.local values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## Project structure

See `CLAUDE.md` for full architecture guide and development instructions.

## Deploying

Push to `main` → Vercel auto-deploys to zoundlist.com.
