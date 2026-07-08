<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';
  import { addJournalColumn, deleteTradesById, normalizeColumnLabel, saveJournalData } from '$lib/journalActions.js';
  import { date, getTradePnl, loadJournalData, money, number, summarizeJournal } from '$lib/journalData.js';

  let data = { settings: {}, trades: [], customColumns: [] };
  let summary = summarizeJournal(data);
  let selectedIds = [];
  let pairFilter = '';
  let sideFilter = 'all';
  let fromDate = '';
  let toDate = '';
  let newColumn = '';
  let notice = '';
  let confirmOpen = false;
  let draftSaveTimer;

  $: filteredTrades = data.trades.filter((trade) => matchesFilters(trade, pairFilter, sideFilter, fromDate, toDate));
  $: allFilteredSelected = filteredTrades.length > 0 && filteredTrades.every((trade) => selectedIds.includes(trade.id));
  $: selectedFilteredIds = filteredTrades.map((trade) => trade.id).filter((id) => selectedIds.includes(id));

  onMount(() => {
    refresh();
    const refreshHandler = () => refresh();
    window.addEventListener('storage', refreshHandler);
    window.addEventListener('journal-data-change', refreshHandler);
    return () => {
      window.removeEventListener('storage', refreshHandler);
      window.removeEventListener('journal-data-change', refreshHandler);
    };
  });

  function refresh() {
    data = loadJournalData();
    summary = summarizeJournal(data);
    selectedIds = selectedIds.filter((id) => data.trades.some((trade) => trade.id === id));
  }

  function matchesFilters(trade, pair, side, from, to) {
    const pairMatches = !pair || String(trade.symbol || '').toLowerCase().includes(pair.toLowerCase());
    const sideMatches = side === 'all' || trade.direction === side;
    const tradeDate = String(trade.date || '').slice(0, 10);
    const fromMatches = !from || tradeDate >= from;
    const toMatches = !to || tradeDate <= to;
    return pairMatches && sideMatches && fromMatches && toMatches;
  }

  function slTp(trade) {
    if (trade.measurementMode === 'price') {
      return `${number(trade.stopPrice)} / ${optionalNumber(trade.takeProfit1 || trade.takeProfit)} / ${optionalNumber(trade.takeProfit2)}`;
    }

    return `${number(trade.slPoints)} / ${optionalNumber(trade.tp1Points || trade.tpPoints)} / ${optionalNumber(trade.tp2Points)}`;
  }

  function optionalNumber(value) {
    return Number(value) > 0 ? number(value) : '-';
  }

  function toggleTrade(id) {
    selectedIds = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredTrades.map((trade) => trade.id));
      selectedIds = selectedIds.filter((id) => !filteredIdSet.has(id));
      return;
    }
    selectedIds = [...new Set([...selectedIds, ...filteredTrades.map((trade) => trade.id)])];
  }

  function addColumn() {
    const result = addJournalColumn(newColumn);
    notice = result.message;
    if (result.ok) {
      newColumn = '';
      refresh();
    }
    setTimeout(() => {
      notice = '';
    }, 2200);
  }

  function askDelete() {
    confirmOpen = true;
  }

  function closeConfirm() {
    confirmOpen = false;
  }

  function handleConfirmOverlay(event) {
    if (event.target === event.currentTarget) closeConfirm();
  }

  function confirmDelete() {
    const ids = selectedFilteredIds;
    if (ids.length) deleteTradesById(ids);
    selectedIds = [];
    closeConfirm();
    refresh();
  }

  function createId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getRiskAmount(settings = {}) {
    return (Number(settings.capital) || 0) * ((Number(settings.riskPercent) || 0) / 100);
  }

  function createEmptyTrade() {
    return {
      id: createId(),
      date: '0',
      symbol: '0',
      direction: 'long',
      measurementMode: 'points',
      entry: 0,
      exitPrice: 0,
      stopPrice: 0,
      takeProfit: 0,
      takeProfit1: 0,
      takeProfit2: 0,
      slPoints: 0,
      tpPoints: 0,
      tp1Points: 0,
      tp2Points: 0,
      rawSl: 0,
      rawTp: 0,
      rawTp1: 0,
      rawTp2: 0,
      pointValue: 0,
      riskAmount: 0,
      lotSize: 0,
      rr: 0,
      estimatedGain: 0,
      result: 'open',
      pnl: null,
      notes: '',
      customFields: Object.fromEntries((data.customColumns || []).map((column) => [column.key, '']))
    };
  }

  function addRow() {
    const next = structuredClone(data);
    const trade = createEmptyTrade();
    next.trades = [trade, ...(next.trades || [])];
    saveJournalData(next);
    data = next;
    summary = summarizeJournal(next);
    pairFilter = '';
    sideFilter = 'all';
    fromDate = '';
    toDate = '';
    notice = 'Trade added.';
    setTimeout(() => {
      notice = '';
    }, 2200);
  }

  function updateTradeCell(tradeId, field, value) {
    const next = structuredClone(data);
    const trade = next.trades.find((item) => item.id === tradeId);
    if (!trade) return;

    if (field.startsWith('custom:')) {
      const key = field.slice('custom:'.length);
      trade.customFields = { ...(trade.customFields || {}), [key]: value.trim() };
    } else if (field === 'date') {
      trade.date = value.trim() || trade.date;
    } else if (field === 'symbol') {
      trade.symbol = value.trim().toUpperCase() || '0';
    } else if (field === 'direction') {
      trade.direction = value === 'short' ? 'short' : 'long';
    } else if (field === 'entry' || field === 'exitPrice') {
      trade[field] = parseNumber(value);
    } else if (field === 'slTp') {
      const [sl = 0, tp1 = 0, tp2 = 0] = value.split('/').map(parseNumber);
      trade.slPoints = sl;
      trade.tp1Points = tp1;
      trade.tp2Points = tp2;
      trade.tpPoints = tp1 || tp2 || 0;
      trade.rawSl = sl;
      trade.rawTp1 = tp1;
      trade.rawTp2 = tp2;
      trade.rawTp = trade.tpPoints;
      if (trade.measurementMode === 'price') {
        trade.stopPrice = sl;
        trade.takeProfit1 = tp1;
        trade.takeProfit2 = tp2;
      }
    } else if (field === 'signalBy' || field === 'notes') {
      trade[field] = value.trim();
    } else if (field === 'pnl') {
      trade.pnl = parseNumber(value);
      trade.manualPnl = true;
    } else if (field === 'result') {
      trade.result = ['open', 'win', 'loss', 'breakeven'].includes(value) ? value : 'open';
    }

    recalculateTrade(trade, next.settings);
    saveJournalData(next);
    data = next;
    summary = summarizeJournal(next);
  }

  function applyTradeValue(trade, field, value) {
    if (field.startsWith('custom:')) {
      const key = field.slice('custom:'.length);
      trade.customFields = { ...(trade.customFields || {}), [key]: value.trim() };
    } else if (field === 'date') {
      trade.date = value.trim() || trade.date;
    } else if (field === 'symbol') {
      trade.symbol = value.trim().toUpperCase() || '0';
    } else if (field === 'direction') {
      trade.direction = value === 'short' ? 'short' : 'long';
    } else if (field === 'entry' || field === 'exitPrice') {
      trade[field] = parseNumber(value);
    } else if (field === 'slTp') {
      const [sl = 0, tp1 = 0, tp2 = 0] = value.split('/').map(parseNumber);
      trade.slPoints = sl;
      trade.tp1Points = tp1;
      trade.tp2Points = tp2;
      trade.tpPoints = tp1 || tp2 || 0;
      trade.rawSl = sl;
      trade.rawTp1 = tp1;
      trade.rawTp2 = tp2;
      trade.rawTp = trade.tpPoints;
      if (trade.measurementMode === 'price') {
        trade.stopPrice = sl;
        trade.takeProfit1 = tp1;
        trade.takeProfit2 = tp2;
      }
    } else if (field === 'signalBy' || field === 'notes') {
      trade[field] = value.trim();
    } else if (field === 'pnl') {
      trade.pnl = parseNumber(value);
      trade.manualPnl = true;
    } else if (field === 'result') {
      trade.result = ['open', 'win', 'loss', 'breakeven'].includes(value) ? value : 'open';
    }
  }

  function saveCellDraft(event, tradeId, field) {
    clearTimeout(draftSaveTimer);
    const value = event.currentTarget.textContent || '';
    draftSaveTimer = setTimeout(() => {
      const next = structuredClone(data);
      const trade = next.trades.find((item) => item.id === tradeId);
      if (!trade) return;
      applyTradeValue(trade, field, value);
      recalculateTrade(trade, next.settings);
      saveJournalData(next, { notify: false });
    }, 180);
  }

  function recalculateTrade(trade, settings = {}) {
    const pointValue = Number(trade.pointValue) || Number(settings.pointValue) || 1;
    const riskAmount = Number(trade.riskAmount) || (Number(settings.capital) || 0) * ((Number(settings.riskPercent) || 0) / 100);
    const slPoints = Number(trade.slPoints) || 0;
    const targetPoints = Number(trade.tp1Points) || Number(trade.tp2Points) || Number(trade.tpPoints) || 0;

    trade.pointValue = pointValue;
    trade.riskAmount = riskAmount;
    trade.lotSize = slPoints > 0 && pointValue > 0 ? riskAmount / (slPoints * pointValue) : 0;
    trade.rr = slPoints > 0 && targetPoints > 0 ? targetPoints / slPoints : 0;
    trade.estimatedGain = riskAmount * trade.rr;

    if (trade.manualPnl) return;
    if (!trade.manualPnl && Number(trade.exitPrice) > 0 && Number(trade.entry) > 0) {
      trade.pnl = (trade.direction === 'short' ? trade.entry - trade.exitPrice : trade.exitPrice - trade.entry) * trade.lotSize * pointValue;
      trade.result = trade.pnl > 0 ? 'win' : trade.pnl < 0 ? 'loss' : 'breakeven';
    } else if (trade.result === 'win') {
      trade.pnl = trade.estimatedGain;
    } else if (trade.result === 'loss') {
      trade.pnl = -riskAmount;
    } else if (trade.result === 'breakeven') {
      trade.pnl = 0;
    }
  }

  function parseNumber(value) {
    const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function pnlTone(value) {
    const pnl = Number(value) || 0;
    return pnl > 0 ? 'pnl-positive' : pnl < 0 ? 'pnl-negative' : '';
  }

  function commitCell(event, tradeId, field) {
    updateTradeCell(tradeId, field, event.currentTarget.textContent || '');
  }

  function handleCellKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.currentTarget.textContent = event.currentTarget.dataset.originalValue || '';
      event.currentTarget.blur();
    }
  }
</script>

<svelte:head>
  <title>Trades | MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/trades" />

<main id="top" class="page-shell">
  <section class="hero compact-hero section-enter">
    <div class="halftone" aria-hidden="true"></div>
    <p class="eyebrow">journal manager</p>
    <h1>trades.</h1>
    <p class="lede">
      Filter, select, edit, delete, and extend the default trade table without leaving the journal system.
    </p>
  </section>

  <section id="summary" class="section-enter">
    <div class="section-heading">
      <p>01 - trade summary</p>
    </div>
    <div class="stats-grid dashboard-stats">
      <div><span>total trades</span><strong>{summary.totalTrades}</strong></div>
      <div><span>win rate</span><strong>{summary.winRate.toFixed(0)}%</strong></div>
      <div><span>rr gain</span><strong>{summary.totalRr.toFixed(2)}R</strong></div>
      <div><span>pnl</span><strong>{money(summary.totalPnl)}</strong></div>
    </div>
  </section>

  <section id="filters" class="section-enter">
    <div class="section-heading">
      <p>02 - filters and columns</p>
      {#if notice}<span class="status-chip is-active">{notice}</span>{/if}
    </div>
    <div class="card management-panel">
      <div class="form-grid">
        <label><span>filter by pair</span><input bind:value={pairFilter} type="search" placeholder="BTCUSDT, EURUSD, AAPL..." /></label>
        <label>
          <span>filter by side</span>
          <select bind:value={sideFilter}>
            <option value="all">All sides</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
        <label><span>from date</span><input bind:value={fromDate} type="date" /></label>
        <label><span>to date</span><input bind:value={toDate} type="date" /></label>
      </div>
      <div class="quote-line custom-entry">
        <label><span>new table column</span><input bind:value={newColumn} list="columnSuggestions" type="text" maxlength="32" placeholder="session, setup..." on:blur={() => (newColumn = normalizeColumnLabel(newColumn))} on:keydown={(event) => event.key === 'Enter' && addColumn()} /></label>
        <datalist id="columnSuggestions">
          <option value="signal by"></option>
          <option value="session"></option>
          <option value="setup"></option>
          <option value="emotion"></option>
        </datalist>
        <button class="primary-button" type="button" on:click={addColumn}>add column</button>
      </div>
    </div>
  </section>

  <section id="all-trades" class="section-enter">
    <div class="section-heading">
      <p class="heading-with-chip">
        <span>03 - all trades</span>
        {#if selectedFilteredIds.length}<span class="selected-count">{selectedFilteredIds.length} selected</span>{/if}
      </p>
      <div class="section-actions">
        <button class="primary-button compact-button" type="button" on:click={addRow}>add trade</button>
        <button class="ghost-button" type="button" on:click={toggleAllFiltered} disabled={!filteredTrades.length}>
          {allFilteredSelected ? 'clear selected' : 'select all'}
        </button>
        {#if selectedFilteredIds.length}
          <button class="danger-button" type="button" on:click={askDelete}>delete checked</button>
        {/if}
      </div>
    </div>
    <div class="journal-table-wrap card trades-table">
      <table>
        <thead>
          <tr>
            <th>
              <label class="mini-check" aria-label="Select all filtered trades">
                <input type="checkbox" checked={allFilteredSelected} on:change={toggleAllFiltered} />
                <span></span>
              </label>
            </th>
            <th>Date</th>
            <th>Pair</th>
            <th>Side</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>SL / TP1 / TP2</th>
            <th>Lots</th>
            <th>RR</th>
            <th>Result</th>
            <th>PnL</th>
            <th>Notes</th>
            {#each data.customColumns as column}
              <th>{column.label}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#if filteredTrades.length}
            {#each filteredTrades as trade}
              <tr class:selected-row={selectedIds.includes(trade.id)}>
                <td>
                  <label class="mini-check" aria-label={`Select ${trade.symbol} trade`}>
                    <input type="checkbox" checked={selectedIds.includes(trade.id)} on:change={() => toggleTrade(trade.id)} />
                    <span></span>
                  </label>
                </td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.date || ''} on:input={(event) => saveCellDraft(event, trade.id, 'date')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'date')}>{date(trade.date)}</span></td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.symbol || ''} on:input={(event) => saveCellDraft(event, trade.id, 'symbol')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'symbol')}>{trade.symbol}</span></td>
                <td>
                  <select class="table-select" value={trade.direction || 'long'} on:change={(event) => updateTradeCell(trade.id, 'direction', event.currentTarget.value)}>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.entry || ''} on:input={(event) => saveCellDraft(event, trade.id, 'entry')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'entry')}>{number(trade.entry)}</span></td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.exitPrice || ''} on:input={(event) => saveCellDraft(event, trade.id, 'exitPrice')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'exitPrice')}>{trade.exitPrice ? number(trade.exitPrice) : ''}</span></td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={slTp(trade)} on:input={(event) => saveCellDraft(event, trade.id, 'slTp')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'slTp')}>{slTp(trade)}</span></td>
                <td>{Number(trade.lotSize || 0).toFixed(2)}</td>
                <td>{Number(trade.rr || 0).toFixed(2)}R</td>
                <td>
                  <select class="table-select" value={trade.result || 'open'} on:change={(event) => updateTradeCell(trade.id, 'result', event.currentTarget.value)}>
                    <option value="open">Open</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="breakeven">Breakeven</option>
                  </select>
                </td>
                <td><span class={`editable-cell ${pnlTone(getTradePnl(trade))}`} contenteditable="true" role="textbox" tabindex="0" data-original-value={getTradePnl(trade)} on:input={(event) => saveCellDraft(event, trade.id, 'pnl')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'pnl')}>{money(getTradePnl(trade))}</span></td>
                <td class="notes-cell" title={trade.notes || ''}><span class="editable-cell notes-editor" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.notes || ''} on:input={(event) => saveCellDraft(event, trade.id, 'notes')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'notes')}>{trade.notes || ''}</span></td>
                {#each data.customColumns as column}
                  <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.customFields?.[column.key] || ''} on:input={(event) => saveCellDraft(event, trade.id, `custom:${column.key}`)} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, `custom:${column.key}`)}>{trade.customFields?.[column.key] || ''}</span></td>
                {/each}
              </tr>
            {/each}
          {:else}
            <tr><td colspan={12 + data.customColumns.length}>No trades match the current filters.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</main>

{#if confirmOpen}
  <div class="confirm-overlay is-visible" role="presentation" on:click={handleConfirmOverlay}>
    <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="deleteConfirmTitle" tabindex="-1">
      <p class="micro">confirmation</p>
      <h2 id="deleteConfirmTitle">Delete checked trades?</h2>
      <p>
        This removes {selectedFilteredIds.length} selected trade{selectedFilteredIds.length === 1 ? '' : 's'}.
        This cannot be undone.
      </p>
      <div class="confirm-actions">
        <button class="ghost-button" type="button" on:click={closeConfirm}>cancel</button>
        <button class="danger-button" type="button" on:click={confirmDelete}>delete</button>
      </div>
    </div>
  </div>
{/if}
