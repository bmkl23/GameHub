# Game Hub

A single Next.js (App Router) app combining two games behind a top nav bar:

- **Wheel Picker** — `/wheel-picker` — spin-the-wheel prize picker
- **Nexora** — `/nexora` — endless runner / jumping game

Visiting `/` redirects to `/wheel-picker`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com/new and import the repo.
3. Framework preset: Next.js (auto-detected). No env vars needed.
4. Click Deploy.

Or from the CLI:

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production deploy
```

## Notes

- The Wheel Picker's fonts (Baloo 2 / Space Grotesk) were switched from
  `next/font/google` to plain CSS font stacks so the build doesn't depend on
  fetching fonts.googleapis.com at build time. If you want the exact
  original fonts, re-add `next/font/google` in
  `components/wheel/WheelPicker.tsx`, or self-host the .woff2 files with
  `next/font/local`.
