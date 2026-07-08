<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';
  import { saveJournalData } from '$lib/journalActions.js';
  import { loadJournalData } from '$lib/journalData.js';

  let data = { settings: {}, trades: [], customColumns: [] };
  let status = '';

  let trade = zeroTrade();
  let customFields = {};

  $: riskAmount = (Number(data.settings?.capital) || 0) * ((Number(data.settings?.riskPercent) || 0) / 100);
  $: savedStopPrice = parseNumber(trade.stopPrice);
  $: savedTakeProfit1 = parseNumber(trade.takeProfit1);
  $: savedTakeProfit2 = parseNumber(trade.takeProfit2);
  $: slDistance = Math.abs(parseNumber(trade.entry) - savedStopPrice);
  $: tp1Distance = Math.abs(savedTakeProfit1 - parseNumber(trade.entry));
  $: tp2Distance = Math.abs(savedTakeProfit2 - parseNumber(trade.entry));
  $: targetDistance = tp1Distance || tp2Distance || 0;
  $: lotSize = slDistance > 0 && Number(trade.pointValue) > 0 ? riskAmount / (slDistance * Number(trade.pointValue)) : 0;
  $: rr = slDistance > 0 && targetDistance > 0 ? targetDistance / slDistance : 0;
  $: estimatedGain = riskAmount * rr;
  $: autoPnl = Number(trade.exitPrice) > 0 && Number(trade.entry) > 0
    ? (trade.direction === 'short' ? Number(trade.entry) - Number(trade.exitPrice) : Number(trade.exitPrice) - Number(trade.entry)) * lotSize * Number(trade.pointValue)
    : 0;

  onMount(() => {
    data = loadJournalData();
    trade = zeroTrade();
    customFields = Object.fromEntries((data.customColumns || []).map((column) => [column.key, '']));
  });

  function zeroTrade() {
    return {
      date: new Date().toISOString().slice(0, 10),
      symbol: '',
      direction: 'long',
      measurementMode: 'price',
      entry: 0,
      exitPrice: 0,
      stopPrice: 0,
      takeProfit1: 0,
      takeProfit2: 0,
      slPoints: 0,
      tp1Points: 0,
      tp2Points: 0,
      pointValue: 1,
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
      date: trade.date || new Date().toISOString().slice(0, 10),
      symbol: String(trade.symbol || '0').trim().toUpperCase() || '0',
      direction: trade.direction,
      measurementMode: 'price',
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
      rawSl: savedStopPrice,
      rawTp: savedTakeProfit1 || savedTakeProfit2,
      rawTp1: savedTakeProfit1,
      rawTp2: savedTakeProfit2,
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
    <div class="table-actions add-trade-actions">
      <button class="primary-button" type="button" on:click={addTrade}>add trade</button>
    </div>
    <div class="card add-trade-card">
      <div class="journal-table-wrap add-trade-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Token/Pair</th>
              <th>Side</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>SL / TP1 / TP2</th>
              <th>Lots</th>
              <th>RR</th>
              <th>Result</th>
              <th>PnL</th>
              <th>Notes</th>
              {#each data.customColumns || [] as column}
                <th>{column.label}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input bind:value={trade.date} type="date" /></td>
              <td><input bind:value={trade.symbol} type="text" maxlength="32" placeholder="BTCUSDT" /></td>
              <td>
                <select bind:value={trade.direction} class:side-select-long={trade.direction === 'long'} class:side-select-short={trade.direction === 'short'}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </td>
              <td><input bind:value={trade.entry} type="number" min="0" step="0.00001" /></td>
              <td><input bind:value={trade.exitPrice} type="number" min="0" step="0.00001" /></td>
              <td>
                <div class="inline-price-stack">
                  <input aria-label="SL price" bind:value={trade.stopPrice} type="number" min="0" step="0.00001" />
                  <span>/</span>
                  <input aria-label="TP1 price" bind:value={trade.takeProfit1} type="number" min="0" step="0.00001" />
                  <span>/</span>
                  <input aria-label="TP2 price" bind:value={trade.takeProfit2} type="number" min="0" step="0.00001" />
                </div>
              </td>
              <td class="readonly-cell">{lotSize.toFixed(2)}</td>
              <td class="readonly-cell">{rr.toFixed(2)}R</td>
              <td>
                <select bind:value={trade.result}>
                  <option value="open">Open</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="breakeven">Breakeven</option>
                </select>
              </td>
              <td><input bind:value={trade.pnl} type="number" step="0.01" placeholder="0" /></td>
              <td><textarea bind:value={trade.notes} rows="1" placeholder="Setup, emotion, execution..."></textarea></td>
              {#each data.customColumns || [] as column}
                <td><input bind:value={customFields[column.key]} type="text" maxlength="120" placeholder="0" /></td>
              {/each}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</main>
