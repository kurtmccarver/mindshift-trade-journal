<script>
  import AppSidebar from '$lib/AppSidebar.svelte';
</script>

<svelte:head>
  <title>Terms and Conditions | MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/terms" />

<main class="page-shell legal-page">
  <section class="hero compact-hero section-enter">
    <p class="eyebrow">legal</p>
    <h1>terms.</h1>
    <p class="lede">Use this journal as a planning and tracking tool, not as financial advice or a broker record.</p>
  </section>

  <section class="card legal-copy section-enter">
    <h2>Trading Information</h2>
    <p>Calculations, RR, PnL, lot size, prop firm beta challenge progress, and dashboard charts are estimates based on the inputs you provide. You are responsible for checking every trade, price, fee, commission, spread, contract size, prop firm rule, and broker rule before acting.</p>

    <h2>Prices</h2>
    <p>Spot and perpetual futures quotes can come from different venues and may fail or differ from the execution price. When a source is unavailable, manually enter the price shown by your broker or exchange.</p>

    <h2>Data And Usage</h2>
    <p>You control your local journal data. Import and export features are provided for convenience, but you should keep your own backups. Do not rely on this app as the only source of account records, tax records, or compliance records.</p>

    <h2>Links And Design Credit</h2>
    <p>External links are provided for reference. The visual direction is based on the bryl-minimal design skill: <a href="https://github.com/bryllim/bryl-minimal-design?fbclid=IwY2xjawS5WWhleHRuA2FlbQIxMQBicmlkETFVbEpIWll0ZzJSbTVVanBlc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHqPNz78HvoySATazerozMWFLBKlF62g4Rr5mcWjjV7_-LeM1eoRrOiUcNCoV_aem_FW_4PewCYM-4Oalm9KAjXw">bryl-minimal-design</a>.</p>
  </section>
</main>
