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
    <p class="lede">MindShift Trade Journal is designed as a local-first trading journal and calculator.</p>
  </section>

  <section class="card legal-copy section-enter">
    <h2>Prices</h2>
    <p>Market prices may be requested from public sources such as supported crypto exchanges, Yahoo Finance, CoinGecko, and TradingView-style search results. Quotes can be delayed, unavailable, inaccurate, or different from your broker or prop firm.</p>

    <h2>Trades And Data</h2>
    <p>Your journal entries, rules, settings, custom columns, imports, and exports are stored in this browser local storage unless you deploy or modify the app with a backend. Clearing browser data can remove saved journal data.</p>
    <p>Backups and scheduled snapshots are also stored locally in this browser. They may include trades, app settings, custom columns, theme preferences, and sidebar pins. Exported backup JSON files are created only when you choose to download them.</p>

    <h2>Information Usage</h2>
    <p>The app uses your entries only to calculate lot size, RR, PnL, challenge progress, filters, charts, and exports. Do not store passwords, API secrets, account logins, or other sensitive credentials in notes or custom columns.</p>

    <h2>Feedback Form</h2>
    <p>The sidebar feedback form asks for your name, optional community, how you heard about the app, and your feedback. Feedback submissions are sent to this app's Supabase project so the developer can review suggestions, understand usage context, and improve the app. The feedback form also stores basic technical metadata such as browser user agent and a hashed client address for abuse prevention and debugging.</p>

    <h2>Supabase</h2>
    <p>Supabase is only used for feedback submissions and the private admin feedback view. Your trade journal, calculator values, imports, exports, settings, and custom table data remain stored in your browser local storage unless the app is later modified to add account syncing.</p>

    <h2>Links</h2>
    <p>External links may open third-party websites with their own privacy practices. The UI design direction references the bryl-minimal design skill on GitHub: <a href="https://github.com/bryllim/bryl-minimal-design?fbclid=IwY2xjawS5WWhleHRuA2FlbQIxMQBicmlkETFVbEpIWll0ZzJSbTVVanBlc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHqPNz78HvoySATazerozMWFLBKlF62g4Rr5mcWjjV7_-LeM1eoRrOiUcNCoV_aem_FW_4PewCYM-4Oalm9KAjXw">bryl-minimal-design</a>.</p>
  </section>
</main>
