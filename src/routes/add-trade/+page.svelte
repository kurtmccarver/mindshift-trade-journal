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
  $: savedStopPrice = Number(trade.stopPrice) > 0 ? Number(trade.stopPrice) : priceFromPoints('stop', Number(trade.slPoints));
  $: savedTakeProfit1 = Number(trade.takeProfit1) > 0 ? Number(trade.takeProfit1) : priceFromPoints('target', Number(trade.tp1Points));
  $: savedTakeProfit2 = Number(trade.takeProfit2) > 0 ? Number(trade.takeProfit2) : priceFromPoints('target', Number(trade.tp2Points));
  $: slDistance = trade.measurementMode === 'price' ? Math.abs(Number(trade.entry) - savedStopPrice) : Number(trade.slPoints) || 0;
  $: tp1Distance = trade.measurementMode === 'price' ? Math.abs(savedTakeProfit1 - Number(trade.entry)) : Number(trade.tp1Points) || 0;
  $: tp2Distance = trade.measurementMode === 'price' ? Math.abs(savedTakeProfit2 - Number(trade.entry)) : Number(trade.tp2Points) || 0;
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

  function priceFromPoints(kind, points) {
    const entry = Number(trade.entry) || 0;
    const distance = Number(points) || 0;
    if (!entry || !distance) return 0;
    if (kind === 'stop') return trade.direction === 'short' ? entry + distance : entry - distance;
    return trade.direction === 'short' ? entry - distance : entry + distance;
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
      stopPrice: savedStopPrice,
      takeProfit: savedTakeProfit1 || savedTakeProfit2,
      takeProfit1: savedTakeProfit1,
      takeProfit2: savedTakeProfit2,
      slPoints: slDistance,
      tpPoints: targetDistance,
      tp1Points: tp1Distance,
      tp2Points: tp2Distance,
      rawSl: trade.measurementMode === 'price' ? savedStopPrice : parseNumber(trade.slPoints),
      rawTp: trade.measurementMode === 'price' ? savedTakeProfit1 || savedTakeProfit2 : parseNumber(trade.tp1Points) || parseNumber(trade.tp2Points),
      rawTp1: trade.measurementMode === 'price' ? savedTakeProfit1 : parseNumber(trade.tp1Points),
      rawTp2: trade.measurementMode === 'price' ? savedTakeProfit2 : parseNumber(trade.tp2Points),
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
      <div class="journal-table-wrap add-trade-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Pair</th>
              <th>Side</th>
              <th>Result</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>SL Price</th>
              <th>TP1 Price</th>
              <th>TP2 Price</th>
              <th>Point Value</th>
              <th>PnL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input bind:value={trade.date} type="date" /></td>
              <td><input bind:value={trade.symbol} type="text" maxlength="32" placeholder="0" /></td>
              <td>
                <select bind:value={trade.direction} class:side-select-long={trade.direction === 'long'} class:side-select-short={trade.direction === 'short'}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </td>
              <td>
                <select bind:value={trade.result}>
                  <option value="open">Open</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="breakeven">Breakeven</option>
                </select>
              </td>
              <td><input bind:value={trade.entry} type="number" min="0" step="0.00001" /></td>
              <td><input bind:value={trade.exitPrice} type="number" min="0" step="0.00001" /></td>
              <td><input bind:value={trade.stopPrice} type="number" min="0" step="0.00001" placeholder={savedStopPrice ? String(savedStopPrice) : '0'} /></td>
              <td><input bind:value={trade.takeProfit1} type="number" min="0" step="0.00001" placeholder={savedTakeProfit1 ? String(savedTakeProfit1) : '0'} /></td>
              <td><input bind:value={trade.takeProfit2} type="number" min="0" step="0.00001" placeholder={savedTakeProfit2 ? String(savedTakeProfit2) : '0'} /></td>
              <td><input bind:value={trade.pointValue} type="number" min="0" step="0.01" /></td>
              <td><input bind:value={trade.pnl} type="number" step="0.01" placeholder="0" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="quote-line custom-entry calc-mode-row">
        <label>
          <span>calculation mode</span>
          <select bind:value={trade.measurementMode}>
            <option value="price">Actual price</option>
            <option value="points">Points</option>
          </select>
        </label>
        {#if trade.measurementMode === 'points'}
          <label><span>sl points</span><input bind:value={trade.slPoints} type="number" min="0" step="0.00001" /></label>
          <label><span>tp1 points</span><input bind:value={trade.tp1Points} type="number" min="0" step="0.00001" /></label>
          <label><span>tp2 points</span><input bind:value={trade.tp2Points} type="number" min="0" step="0.00001" /></label>
        {:else}
          <p class="price-source">Sizing uses entry, SL price, and TP price from the trade row.</p>
        {/if}
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
