# MindShift Trade Journal

MindShift Trade Journal is a clean trading journal and risk workspace made by Kurt McCarver. It helps you record trades, calculate volume, track PnL and RR, review your performance, and keep local backups of your data.

The app is built for traders who want a simple place to manage their trades without turning the journal into a complicated spreadsheet.

## What You Can Do

- Add trades from the dedicated Add Trade page or directly inside the journal table
- Edit trades inline after saving them
- Track token, time/date, margin, side, entry, exit, stop loss, PnL %, PnL, caller, and notes
- Use Simple Mode for personal trading
- Use Prop Firm Mode when you want rules, targets, phases, and challenge tracking
- View dashboard charts for PnL, results, traded pairs/tokens, and signals
- Search supported crypto, forex, index, and stock symbols
- Use live prices when public sources are available
- Enter prices manually when a symbol has no public match
- Import and export CSV files
- Create backups and restore previous data
- Send feedback through the sidebar form

## First Visit

When you first open the app, an instruction modal appears. It explains the available mode and pages step by step. After you finish or skip it, it will not appear again unless you open Instructions from the sidebar.

The default mode is Simple Mode.

## Pages

### Add Trade

Use this when you want to quickly journal a new trade. It is pinned at the top of the sidebar so it is always easy to reach.

### Dashboard

Dashboard is the main workspace. Use it to review total trades, win rate, RR gain, PnL, traded pairs/tokens, caller performance, recent trades, and prop-firm progress when enabled.

### Trades

Trades is the full journal manager. You can filter, select, edit inline, add custom columns, and manage rows from one table.

### Calculator

Calculator is a standalone lot-size and volume calculator for quick sizing.

### Rules

Rules appears when Prop Firm Mode is enabled. It tracks capital, phase targets, risk settings, daily loss, and completion status.

### Settings

Settings controls display preferences, currency, mode, theme, data import/export, and reset options.

### Backup

Backup stores local snapshots of your journal and settings. You can create a manual backup, import/export backup JSON files, restore a backup, and choose how often automatic snapshots should be created.

Backups are stored in your browser unless you export them as files.

## Data And Privacy

Your trades, settings, custom columns, theme, sidebar pins, and backups are stored locally in your browser. They are not sent to a database by default.

The feedback form is the only app feature connected to Supabase. It can send your name, community, how you heard about the app, feedback, and page URL so the app can be improved.

Price data comes from public market APIs and may be delayed, unavailable, incomplete, rate limited, or different from your broker or exchange execution price. Always verify prices with your trading platform before placing trades.

This app does not place trades and is not financial advice.

## Keeping Your Data Safe

- Use Backup before making big changes
- Export backup JSON files if you want a copy outside the browser
- Export CSV files if you want spreadsheet copies of your trades
- Avoid clearing browser storage unless you already exported your data
- Use the same browser and device when you want to keep seeing the same local data

## Feedback

Use Send Feedback in the sidebar to report issues, suggest improvements, or share what would make the journal better.

## Design Credit

The interface follows the Bryl minimal design direction:

https://github.com/bryllim/bryl-minimal-design

## For Deployment

MindShift Trade Journal is a SvelteKit app ready for Vercel.

```bash
npm install
npm run check
npm run build
```

Feedback requires these environment variables when deployed:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FEEDBACK_ADMIN_TOKEN=
ADMIN_PANEL_SLUG=
```

Use `ADMIN_PANEL_SLUG` to create a private feedback console URL, and keep it out of public docs, screenshots, and commits. Never publish service role keys, admin tokens, broker credentials, exchange API keys, or account credentials.

## License

MIT. See `LICENSE`.
