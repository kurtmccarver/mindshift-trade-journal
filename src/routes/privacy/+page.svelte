<script>
  import AppSidebar from '$lib/AppSidebar.svelte';
</script>

<svelte:head>
  <title>Privacy Policy | MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/privacy" />

<main class="page-shell legal-page">
  <section class="hero compact-hero section-enter">
    <p class="eyebrow">legal</p>
    <h1>privacy.</h1>
    <p class="lede">MindShift Trade Journal is local-first. Your trade journal stays in your browser unless you choose to export, restore, or send feedback.</p>
  </section>

  <section class="card legal-copy section-enter">
    <h2>Local Journal Data</h2>
    <p>Your trades, notes, settings, custom columns, rules, imports, exports, backups, theme preferences, and sidebar pins are stored in this browser's local storage. They are not uploaded to a MindShift account because this app does not currently provide user accounts or cloud journal sync.</p>
    <p>Clearing browser storage, changing browsers, using private browsing, or resetting app data can remove your saved journal. Use export and backup features if you need a copy outside this browser.</p>

    <h2>Backups And Exports</h2>
    <p>Backups and scheduled snapshots are stored locally in this browser. Exported CSV or backup JSON files are created only when you choose to download them. Those files may include trades, notes, settings, custom columns, rules, theme preferences, and sidebar pins.</p>

    <h2>Market Prices</h2>
    <p>Market prices may be requested from public sources such as supported crypto exchanges, Yahoo Finance, CoinGecko, and TradingView-style search results. Quotes can be delayed, unavailable, inaccurate, or different from your broker, exchange, or prop firm.</p>

    <h2>Information Usage</h2>
    <p>The app uses your local entries to calculate risk, volume, RR, PnL, prop firm beta challenge progress, filters, charts, backups, and exports. Do not store passwords, API secrets, account logins, seed phrases, or other sensitive credentials in notes or custom columns.</p>

    <h2>Analytics</h2>
    <p>PostHog may be used for basic product analytics such as app opens, active usage, mode selection, total trade count, open and closed trade counts, custom column count, backup count, currency, and date format. Autocapture and session recording are disabled.</p>
    <p>The app does not send trade symbols, notes, prices, PnL values, entry or exit values, dates, screenshots, or individual trade details to PostHog.</p>

    <h2>Feedback Form</h2>
    <p>The sidebar feedback form asks for your name, optional community, how you heard about the app, and your feedback. Feedback submissions are sent to this app's Supabase project so the developer can review suggestions, understand usage context, and improve the app.</p>
    <p>The feedback form may also store basic technical metadata such as browser user agent and a hashed client address for abuse prevention and debugging. Do not submit private trading account credentials, passwords, API keys, or sensitive financial information through feedback.</p>

    <h2>Supabase</h2>
    <p>Supabase is only used for feedback submissions and the private admin feedback view. Your trade journal, calculator values, imports, exports, settings, backups, and custom table data remain stored in your browser local storage unless the app is later modified to add account syncing.</p>

    <h2>Links</h2>
    <p>External links may open third-party websites with their own privacy practices. The UI design direction references the bryl-minimal design skill on GitHub: <a href="https://github.com/bryllim/bryl-minimal-design?fbclid=IwY2xjawS5WWhleHRuA2FlbQIxMQBicmlkETFVbEpIWll0ZzJSbTVVanBlc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHqPNz78HvoySATazerozMWFLBKlF62g4Rr5mcWjjV7_-LeM1eoRrOiUcNCoV_aem_FW_4PewCYM-4Oalm9KAjXw">bryl-minimal-design</a>.</p>

    <h2>Changes</h2>
    <p>This policy may be updated as the app changes. Continued use of the app after updates means you accept the updated policy.</p>
  </section>
</main>
