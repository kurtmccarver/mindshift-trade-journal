<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';
  import { saveJournalData } from '$lib/journalActions.js';
  import { loadJournalData, money } from '$lib/journalData.js';

  let data = { settings: {}, trades: [], customColumns: [] };
  let status = '';

  let trade = zeroTrade();
  let customFields = {};

  $: riskAmount = (Number(data.settings?.capital) || 0) * ((Number(data.settings?.riskPercent) || 0) / 100);
  $: slDistance = trade.measurementMode === 'price' ? Math.abs(Number(trade.entry) - Number(trade.stopPrice)) : Number(trade.slPoints) || 0;
  $: tp1Distance = trade.measurementMode === 'price' ? Math.abs(Number(trade.takeProfit1) - Number(trade.entry)) : Number(trade.tp1Points) || 0;
  $: tp2Distance = trade.measurementMode === 'price' ? Math.abs(Number(trade.takeProfit2) - Number(trade.entry)) : Number(trade.tp2Points) || 0;
  $: targetDistance = tp1Distance || tp2Distance || 0;
  $: lotSize = slDistance > 0 && Number(trade.pointValue) > 0 ? riskAmount / (slDistance * Number(trade.pointValue)) : 0;
  $: rr = slDistance > 0 && targetDistance > 0 ? targetDistance / slDistance : 0;
  $: estimatedGain = riskAmount * rr;
  $: autoPnl = Number(trade.exitPrice) > 0 && Number(trade.entry) > 0
    ? (trade.direction === 'short' ? Number(trade.entry) - Number(trade.exitPrice) : Number(trade.exitPrice) - Number(trade.entry)) * lotSize * Number(trade.pointValue)
    : 0;

  onMount(() => {
    data = loadJournalData();
    customFields = Object.fromEntries((data.customColumns || []).map((column) => [column.key, '']));
  });

  function zeroTrade() {
    return {
      date: '',
      symbol: '0',
      direction: 'long',
      measurementMode: 'points',
      entry: 0,
      exitPrice: 0,
      stopPrice: 0,
      takeProfit1: 0,
      takeProfit2: 0,
      slPoints: 0,
      tp1Points: 0,
      tp2Points: 0,
      pointValue: 0,
      result: 'open',
      pnl: '',
      notes: ''
    };
  }

  function createId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseNumber(value) {
    const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function addTrade() {
    const manualPnl = trade.pnl !== '';
    const pnl = manualPnl
      ? parseNumber(trade.pnl)
      : Number(trade.exitPrice) > 0
        ? autoPnl
        : trade.result === 'win'
          ? estimatedGain
          : trade.result === 'loss'
            ? -riskAmount
            : trade.result === 'breakeven'
              ? 0
              : null;

    const nextTrade = {
      id: createId(),
      date: trade.date || '0',
      symbol: String(trade.symbol || '0').trim().toUpperCase() || '0',
      direction: trade.direction,
      measurementMode: trade.measurementMode,
      entry: parseNumber(trade.entry),
      exitPrice: parseNumber(trade.exitPrice),
      stopPrice: parseNumber(trade.stopPrice),
      takeProfit: parseNumber(trade.takeProfit1) || parseNumber(trade.takeProfit2),
      takeProfit1: parseNumber(trade.takeProfit1),
      takeProfit2: parseNumber(trade.takeProfit2),
      slPoints: slDistance,
      tpPoints: targetDistance,
      tp1Points: tp1Distance,
      tp2Points: tp2Distance,
      rawSl: trade.measurementMode === 'price' ? parseNumber(trade.stopPrice) : parseNumber(trade.slPoints),
      rawTp: trade.measurementMode === 'price' ? parseNumber(trade.takeProfit1) || parseNumber(trade.takeProfit2) : parseNumber(trade.tp1Points) || parseNumber(trade.tp2Points),
      rawTp1: trade.measurementMode === 'price' ? parseNumber(trade.takeProfit1) : parseNumber(trade.tp1Points),
      rawTp2: trade.measurementMode === 'price' ? parseNumber(trade.takeProfit2) : parseNumber(trade.tp2Points),
      pointValue: parseNumber(trade.pointValue),
      riskAmount,
      lotSize,
      rr,
      estimatedGain,
      result: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : trade.result,
      pnl,
      manualPnl,
      notes: trade.notes.trim(),
      customFields: { ...customFields }
    };

    const next = {
      ...data,
      trades: [nextTrade, ...(data.trades || [])]
    };
    saveJournalData(next);
    data = next;
    trade = zeroTrade();
    customFields = Object.fromEntries((data.customColumns || []).map((column) => [column.key, '']));
    status = 'Trade added.';
    setTimeout(() => {
      status = '';
    }, 2200);
  }
</script>

<svelte:head>
  <title>Add Trade | MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/add-trade" />

<main id="top" class="page-shell">
  <section class="hero compact-hero section-enter">
    <p class="eyebrow">quick journal</p>
    <h1>add trade.</h1>
    <p class="lede">Input a trade directly into the journal without opening the full workspace.</p>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>01 - trade input</p>
      {#if status}<span class="status-chip is-active">{status}</span>{/if}
    </div>
    <form class="card add-trade-card" on:submit|preventDefault={addTrade}>
      <div class="calculator-group">
        <p class="micro">details</p>
        <div class="form-grid">
          <label><span>date</span><input bind:value={trade.date} type="date" /></label>
          <label><span>pair / token</span><input bind:value={trade.symbol} type="text" maxlength="32" placeholder="0" /></label>
          <label>
            <span>side</span>
            <select bind:value={trade.direction} class:side-select-long={trade.direction === 'long'} class:side-select-short={trade.direction === 'short'}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
          <label>
            <span>result</span>
            <select bind:value={trade.result}>
              <option value="open">Open</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </label>
        </div>
      </div>

      <div class="calculator-group">
        <p class="micro">price and risk</p>
        <div class="form-grid">
          <label>
            <span>measurement</span>
            <select bind:value={trade.measurementMode}>
              <option value="points">Points</option>
              <option value="price">Actual price</option>
            </select>
          </label>
          <label><span>entry</span><input bind:value={trade.entry} type="number" min="0" step="0.00001" /></label>
          <label><span>exit optional</span><input bind:value={trade.exitPrice} type="number" min="0" step="0.00001" /></label>
          {#if trade.measurementMode === 'price'}
            <label><span>stop price</span><input bind:value={trade.stopPrice} type="number" min="0" step="0.00001" /></label>
            <label><span>tp1 price optional</span><input bind:value={trade.takeProfit1} type="number" min="0" step="0.00001" /></label>
            <label><span>tp2 price optional</span><input bind:value={trade.takeProfit2} type="number" min="0" step="0.00001" /></label>
          {:else}
            <label><span>sl points</span><input bind:value={trade.slPoints} type="number" min="0" step="0.00001" /></label>
            <label><span>tp1 points optional</span><input bind:value={trade.tp1Points} type="number" min="0" step="0.00001" /></label>
            <label><span>tp2 points optional</span><input bind:value={trade.tp2Points} type="number" min="0" step="0.00001" /></label>
          {/if}
          <label><span>point value / lot</span><input bind:value={trade.pointValue} type="number" min="0" step="0.01" /></label>
          <label><span>manual pnl optional</span><input bind:value={trade.pnl} type="number" step="0.01" placeholder="0" /></label>
        </div>
      </div>

      {#if data.customColumns?.length}
        <div class="calculator-group">
          <p class="micro">custom columns</p>
          <div class="form-grid">
            {#each data.customColumns as column}
              <label><span>{column.label}</span><input bind:value={customFields[column.key]} type="text" maxlength="120" placeholder="0" /></label>
            {/each}
          </div>
        </div>
      {/if}

      <div class="stats-grid calculator-stats">
        <div><span>risk amount</span><strong>{money(riskAmount)}</strong></div>
        <div><span>volume</span><strong>{lotSize.toFixed(2)}</strong></div>
        <div><span>rr gain</span><strong>{rr.toFixed(2)}R</strong></div>
        <div><span>estimated gain</span><strong>{money(estimatedGain)}</strong></div>
      </div>

      <label class="notes-label">
        <span>notes</span>
        <textarea bind:value={trade.notes} rows="4" placeholder="Setup, emotion, execution..."></textarea>
      </label>

      <button class="primary-button wide" type="submit">add trade</button>
    </form>
  </section>
</main>
