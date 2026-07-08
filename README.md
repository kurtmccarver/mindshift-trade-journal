# MindShift Trade Journal

MindShift Trade Journal is a local-first SvelteKit trading workspace made by Kurt McCarver. It helps traders calculate position volume, journal trades, track PnL and RR, review performance charts, and optionally follow prop-firm challenge rules.

Version: `1.0.0`

## Features

- Clean minimal UI with light and dark mode
- Step-by-step instruction modal on site load
- Simple mode and prop-firm mode
- Prop-firm rules for capital, phase targets, risk, max loss, and completion checks
- Standalone calculator and home-page calculator
- Spot and perpetual crypto price sources from supported exchanges
- Yahoo Finance fallback for forex, indices, stocks, and other public symbols
- Manual live-price entry when public sources are unavailable
- Inline editable trade journal
- Custom table columns with smart `signal by` detection
- Dashboard charts for equity, results, traded pairs/tokens, and signal performance
- CSV import and export
- Sidebar feedback form backed by Supabase
- Private admin feedback page protected by `FEEDBACK_ADMIN_TOKEN`
- Vercel production configuration

## Tech Stack

- SvelteKit 2
- Svelte 5
- Vite 6
- Vercel adapter
- Supabase REST API for feedback only
- Browser local storage for trades, settings, custom columns, and preferences

## Local Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

## Production Build

```bash
npm run check
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env.local` for local feedback testing:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FEEDBACK_ADMIN_TOKEN=change-this-long-random-admin-token
```

Add the same values in Vercel Project Settings before production deploy.

Important: never commit `.env.local`, service role keys, admin tokens, broker credentials, exchange API keys, or account credentials.

## Supabase Feedback Setup

Trades and settings are stored locally in the browser. Supabase is only used for the sidebar feedback form and private admin feedback view.

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/feedback.sql`.
4. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `FEEDBACK_ADMIN_TOKEN`.
5. Deploy to Vercel.
6. Visit `/admin` and enter `FEEDBACK_ADMIN_TOKEN` to read feedback.

## Deployment To Vercel

This project is ready for Vercel with:

- `@sveltejs/adapter-vercel`
- `vercel.json`
- Node.js 22 runtime
- `npm run build` build command

Recommended Vercel settings:

- Framework preset: SvelteKit
- Build command: `npm run build`
- Install command: `npm install`
- Node.js version: 22.x

## Security Notes

- Trade journal data stays in browser local storage unless future account sync is added.
- Feedback submissions are rate limited server-side.
- Price API requests are rate limited server-side.
- Supabase service role access is only used server-side.
- Admin feedback access requires `FEEDBACK_ADMIN_TOKEN`.
- User text inputs are length-limited and normalized before storage.
- Price data comes from public APIs and may be delayed, unavailable, incomplete, or different from broker execution prices.
- This app is not financial advice and does not place trades.

If a service role key, admin token, or other credential is exposed, rotate it immediately.

## Design Credit

The UI direction follows the Bryl minimal design skill:

https://github.com/bryllim/bryl-minimal-design

## Scripts

```bash
npm run dev      # Start local development server
npm run check    # Run Svelte diagnostics
npm run build    # Build production app
npm run preview  # Preview production build locally
```

## License

MIT. See `LICENSE`.
