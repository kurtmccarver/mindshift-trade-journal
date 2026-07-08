<script>
  import AppSidebar from '$lib/AppSidebar.svelte';
  import { formatMoney, loadAppSettings } from '$lib/appSettings.js';

  let capital = 10000;
  let riskPercent = 1;
  let riskMoney = 100;
  let entry = 0;
  let stopLoss = 100;
  let pointValue = 100;
  let target = 200;
  let mode = 'points';

  $: riskAmount = riskMoney || capital * (riskPercent / 100);
  $: slDistance = mode === 'price' ? Math.abs(entry - stopLoss) : Number(stopLoss) || 0;
  $: tpDistance = mode === 'price' ? Math.abs(target - entry) : Number(target) || 0;
  $: lots = slDistance > 0 && pointValue > 0 ? riskAmount / (slDistance * pointValue) : 0;
  $: rr = slDistance > 0 && tpDistance > 0 ? tpDistance / slDistance : 0;
  $: gain = riskAmount * rr;

  function money(value) {
    return formatMoney(value, loadAppSettings());
  }
</script>

<svelte:head>
  <title>Lot Calculator | MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/calculator" />

<main id="top" class="page-shell">
  <section class="hero compact-hero section-enter">
    <div class="halftone" aria-hidden="true"></div>
    <p class="eyebrow">always ready</p>
    <h1>calculator.</h1>
    <p class="lede">A fast standalone lot-size calculator for quick sizing without opening the full journal workflow.</p>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>01 - lot sizing</p>
      <span class="status-chip">{lots.toFixed(2)} volume</span>
    </div>
    <div class="card">
      <div class="form-grid">
        <label><span>capital</span><input bind:value={capital} type="number" min="0" step="100" placeholder="10000" /></label>
        <label><span>risk %</span><input bind:value={riskPercent} type="number" min="0" step="0.1" placeholder="1" /></label>
        <label><span>risk money</span><input bind:value={riskMoney} type="number" min="0" step="1" placeholder="100" /></label>
        <label>
          <span>measurement</span>
          <select bind:value={mode}>
            <option value="points">Points</option>
            <option value="price">Actual price</option>
          </select>
        </label>
        <label><span>entry</span><input bind:value={entry} type="number" min="0" step="0.00001" placeholder="optional" /></label>
        <label><span>{mode === 'price' ? 'stop price' : 'stop loss points'}</span><input bind:value={stopLoss} type="number" min="0" step="0.00001" placeholder="100" /></label>
        <label><span>{mode === 'price' ? 'target price' : 'target points'}</span><input bind:value={target} type="number" min="0" step="0.00001" placeholder="200" /></label>
        <label><span>value per price move / lot</span><input bind:value={pointValue} type="number" min="0" step="0.01" placeholder="100" /></label>
      </div>
      <div class="stats-grid calculator-stats">
        <div><span>risk amount</span><strong>{money(riskAmount)}</strong></div>
        <div><span>volume</span><strong>{lots.toFixed(2)}</strong></div>
        <div><span>rr gain</span><strong>{rr.toFixed(2)}R</strong></div>
        <div><span>estimated gain</span><strong>{money(gain)}</strong></div>
      </div>
    </div>
  </section>
</main>
