<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';
  import CustomSelect from '$lib/CustomSelect.svelte';
  import { saveJournalData } from '$lib/journalActions.js';
  import { loadJournalData } from '$lib/journalData.js';

  let data = { settings: {}, trades: [], customColumns: [] };
  let status = '';

  let trade = zeroTrade();
  let customFields = {};
  const sideOptions = [
    { value: 'long', label: 'Long' },
    { value: 'short', label: 'Short' }
  ];
  const resultOptions = [
    { value: 'open', label: 'Open' },
    { value: 'win', label: 'Win' },
    { value: 'loss', label: 'Loss' },
    { value: 'breakeven', label: 'Breakeven' }
  ];

  $: riskAmount = (Number(data.settings?.capital) || 0) * ((Number(data.settings?.riskPercent) || 0) / 100);
  $: savedStopPrice = parseNumber(trade.stopPrice);
  $: slDistance = Math.abs(parseNumber(trade.entry) - savedStopPrice);
  $: exitDistance = Math.abs(parseNumber(trade.exitPrice) - parseNumber(trade.entry));
  $: effectivePointValue = parseNumber(trade.pointValue) || Number(data.settings?.pointValue) || 1;
  $: lotSize = parseNumber(trade.lotSize) || (slDistance > 0 && effectivePointValue > 0 ? riskAmount / (slDistance * effectivePointValue) : 0);
  $: rr = slDistance > 0 && exitDistance > 0 ? exitDistance / slDistance : 0;
  $: autoPnl = Number(trade.exitPrice) > 0 && Number(trade.entry) > 0
    ? (trade.direction === 'short' ? Number(trade.entry) - Number(trade.exitPrice) : Number(trade.exitPrice) - Number(trade.entry)) * lotSize * effectivePointValue
    : 0;
  $: resolvedPnl = trade.pnl !== '' ? parseNumber(trade.pnl) : autoPnl;
  $: pnlPercent = riskAmount > 0 ? (resolvedPnl / riskAmount) * 100 : 0;
  $: visibleCustomColumns = (data.customColumns || []).filter((column) => !/^(margin|caller|leverage)$/i.test(column.label || column.key || ''));

  onMount(() => {
    data = loadJournalData();
    trade = zeroTrade();
    customFields = Object.fromEntries(visibleCustomColumns.map((column) => [column.key, '']));
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
      slPoints: 0,
      pointValue: '',
      lotSize: '',
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
    const pnl = manualPnl ? parseNumber(trade.pnl) : Number(trade.exitPrice) > 0 ? autoPnl : null;

    const nextTrade = {
      id: createId(),
      date: trade.date || new Date().toISOString().slice(0, 10),
      symbol: String(trade.symbol || '0').trim().toUpperCase() || '0',
      direction: trade.direction,
      measurementMode: 'price',
      margin: riskAmount,
      entry: parseNumber(trade.entry),
      exitPrice: parseNumber(trade.exitPrice),
      stopPrice: savedStopPrice,
      takeProfit: 0,
      takeProfit1: 0,
      takeProfit2: 0,
      takeProfit3: 0,
      slPoints: slDistance,
      tpPoints: 0,
      tp1Points: 0,
      tp2Points: 0,
      tp3Points: 0,
      rawSl: savedStopPrice,
      rawTp: 0,
      rawTp1: 0,
      rawTp2: 0,
      rawTp3: 0,
      pointValue: effectivePointValue,
      riskAmount,
      lotSize,
      rr,
      estimatedGain: pnl || 0,
      result: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : trade.result,
      pnl,
      pnlPercent,
      manualPnl,
      caller: '',
      signalBy: '',
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
    customFields = Object.fromEntries(visibleCustomColumns.map((column) => [column.key, '']));
    status = 'Trade added.';
    window.dispatchEvent(new CustomEvent('mindshift-notify', { detail: { message: 'Trade Added' } }));
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
    <div class="card add-trade-card add-trade-form-card">
      <div class="add-trade-form">
        <label class="field date-field">
          <span>date</span>
          <input bind:value={trade.date} type="date" />
        </label>

        <div class="form-row two-cols">
          <label class="field">
            <span>pair</span>
            <input bind:value={trade.symbol} type="text" maxlength="32" placeholder="BTCUSDT" />
          </label>
          <label class="field">
            <span>side</span>
            <CustomSelect bind:value={trade.direction} options={sideOptions} tone={trade.direction} ariaLabel="Trade side" />
          </label>
        </div>

        <div class="form-row price-row simple-price-row">
          <label class="field">
            <span>entry</span>
            <input bind:value={trade.entry} type="number" min="0" step="0.00001" />
          </label>
          <label class="field">
            <span>sl</span>
            <input bind:value={trade.stopPrice} type="number" min="0" step="0.00001" />
          </label>
          <label class="field">
            <span>exit</span>
            <input bind:value={trade.exitPrice} type="number" min="0" step="0.00001" />
          </label>
        </div>

        <label class="field result-field">
          <span>result</span>
          <CustomSelect bind:value={trade.result} options={resultOptions} ariaLabel="Trade result" />
        </label>

        {#if visibleCustomColumns.length}
          <div class="form-row custom-fields-row">
            {#each visibleCustomColumns as column}
              <label class="field">
                <span>{column.label}</span>
                <input bind:value={customFields[column.key]} type="text" maxlength="120" placeholder="0" />
              </label>
            {/each}
          </div>
        {/if}

        <label class="field notes-field">
          <span>notes</span>
          <textarea bind:value={trade.notes} rows="4" placeholder="Setup, emotion, execution..."></textarea>
        </label>

        <div class="stats-grid add-trade-stats">
          <div><span>lot</span><strong>{lotSize.toFixed(2)}</strong></div>
          <div><span>rr</span><strong>{rr.toFixed(2)}R</strong></div>
          <div class="pnl-entry">
            <span>pnl</span>
            <input bind:value={trade.pnl} type="number" step="0.01" placeholder="0" />
          </div>
        </div>

        <button class="primary-button wide" type="button" on:click={addTrade}>Add Trade</button>
      </div>
    </div>
  </section>
</main>
