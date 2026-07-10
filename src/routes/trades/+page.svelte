<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';
  import CustomSelect from '$lib/CustomSelect.svelte';
  import { deleteTradesById, saveJournalData } from '$lib/journalActions.js';
  import { date, getTradePnl, loadJournalData, money, number, summarizeJournal } from '$lib/journalData.js';

  let data = { settings: {}, trades: [], customColumns: [] };
  let summary = summarizeJournal(data);
  let pairFilter = '';
  let sideFilter = 'all';
  let notesFilter = '';
  let fromDate = '';
  let toDate = '';
  let notice = '';
  let confirmOpen = false;
  let deleteTarget = null;
  const sideOptions = [
    { value: 'long', label: 'Long' },
    { value: 'short', label: 'Short' }
  ];
  const sideFilterOptions = [
    { value: 'all', label: 'All sides' },
    ...sideOptions
  ];
  const resultOptions = [
    { value: 'open', label: 'Open' },
    { value: 'win', label: 'Win' },
    { value: 'loss', label: 'Loss' },
    { value: 'breakeven', label: 'Breakeven' }
  ];
  const resultCycle = resultOptions.map((option) => option.value);

  $: filteredTrades = data.trades.filter((trade) => matchesFilters(trade, pairFilter, sideFilter, notesFilter, fromDate, toDate));
  $: visibleCustomColumns = (data.customColumns || []).filter((column) => !/^(margin|caller|leverage)$/i.test(column.label || column.key || ''));

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
  }

  function matchesFilters(trade, pair, side, notes, from, to) {
    const pairMatches = !pair || String(trade.symbol || '').toLowerCase().includes(pair.toLowerCase());
    const sideMatches = side === 'all' || trade.direction === side;
    const notesMatches = !notes || String(trade.notes || '').toLowerCase().includes(notes.toLowerCase());
    const tradeDate = String(trade.date || '').slice(0, 10);
    const fromMatches = !from || tradeDate >= from;
    const toMatches = !to || tradeDate <= to;
    return pairMatches && sideMatches && notesMatches && fromMatches && toMatches;
  }

  function askDelete(trade) {
    deleteTarget = trade;
    confirmOpen = true;
  }

  function closeConfirm() {
    confirmOpen = false;
    deleteTarget = null;
  }

  function handleConfirmOverlay(event) {
    if (event.target === event.currentTarget) closeConfirm();
  }

  function confirmDelete() {
    if (deleteTarget?.id) deleteTradesById([deleteTarget.id]);
    closeConfirm();
    refresh();
    notice = 'Trade deleted.';
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
    } else if (field === 'entry' || field === 'exitPrice' || field === 'stopPrice' || field === 'margin' || field === 'lotSize' || field === 'pnlPercent' || field === 'riskAmount') {
      trade[field] = parseNumber(value);
      if (field === 'riskAmount') {
        trade.margin = trade.riskAmount;
        trade.manualRisk = true;
      }
    } else if (field === 'caller') {
      trade.caller = value.trim();
      trade.signalBy = trade.caller;
    } else if (field === 'notes') {
      trade[field] = value.trim();
    } else if (field === 'pnl') {
      trade.pnl = parseNumber(value);
      trade.manualPnl = true;
      const margin = Number(trade.margin) || Number(trade.riskAmount) || 0;
      trade.pnlPercent = margin > 0 ? (trade.pnl / margin) * 100 : Number(trade.pnlPercent) || 0;
    } else if (field === 'result') {
      trade.result = ['open', 'win', 'loss', 'breakeven'].includes(value) ? value : 'open';
    }

    recalculateTrade(trade, next.settings);
    saveJournalData(next);
    data = next;
    summary = summarizeJournal(next);
    window.dispatchEvent(new CustomEvent('mindshift-notify', { detail: { message: 'Trade Updated' } }));
  }

  function toggleResult(tradeId, currentResult) {
    const currentIndex = resultCycle.indexOf(currentResult || 'open');
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % resultCycle.length : 0;
    updateTradeCell(tradeId, 'result', resultCycle[nextIndex]);
  }

  function resultArrow(result) {
    if (result === 'win') return '↑';
    if (result === 'loss') return '↓';
    return '→';
  }

  function resultLabel(result) {
    return resultOptions.find((option) => option.value === result)?.label || 'Open';
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
    } else if (field === 'entry' || field === 'exitPrice' || field === 'stopPrice' || field === 'margin' || field === 'lotSize' || field === 'pnlPercent' || field === 'riskAmount') {
      trade[field] = parseNumber(value);
      if (field === 'riskAmount') {
        trade.margin = trade.riskAmount;
        trade.manualRisk = true;
      }
    } else if (field === 'caller') {
      trade.caller = value.trim();
      trade.signalBy = trade.caller;
    } else if (field === 'notes') {
      trade[field] = value.trim();
    } else if (field === 'pnl') {
      trade.pnl = parseNumber(value);
      trade.manualPnl = true;
      const margin = Number(trade.margin) || Number(trade.riskAmount) || 0;
      trade.pnlPercent = margin > 0 ? (trade.pnl / margin) * 100 : Number(trade.pnlPercent) || 0;
    } else if (field === 'result') {
      trade.result = ['open', 'win', 'loss', 'breakeven'].includes(value) ? value : 'open';
    }
  }

  function saveCellDraft(event, tradeId, field) {
    const value = event.currentTarget.textContent || '';
    const next = structuredClone(data);
    const trade = next.trades.find((item) => item.id === tradeId);
    if (!trade) return;
    applyTradeValue(trade, field, value);
    recalculateTrade(trade, next.settings);
    saveJournalData(next, { notify: false });
    data = next;
    summary = summarizeJournal(next);
  }

  function recalculateTrade(trade, settings = {}) {
    const pointValue = Number(trade.pointValue) || Number(settings.pointValue) || 1;
    const settingsRiskAmount = (Number(settings.capital) || 0) * ((Number(settings.riskPercent) || 0) / 100);
    const riskAmount = trade.manualRisk ? Number(trade.riskAmount) || 0 : settingsRiskAmount;
    const slPoints = Number(trade.stopPrice) > 0 && Number(trade.entry) > 0 ? Math.abs(Number(trade.entry) - Number(trade.stopPrice)) : Number(trade.slPoints) || 0;
    const exitPoints = Number(trade.exitPrice) > 0 && Number(trade.entry) > 0 ? Math.abs(Number(trade.exitPrice) - Number(trade.entry)) : 0;

    trade.pointValue = pointValue;
    trade.margin = riskAmount;
    trade.riskAmount = riskAmount;
    trade.slPoints = slPoints;
    trade.lotSize = slPoints > 0 && pointValue > 0 ? riskAmount / (slPoints * pointValue) : 0;
    trade.rr = slPoints > 0 && exitPoints > 0 ? exitPoints / slPoints : Number(trade.rr) || 0;

    if (trade.manualPnl) return;
    if (!trade.manualPnl && Number(trade.exitPrice) > 0 && Number(trade.entry) > 0) {
      trade.pnl = (trade.direction === 'short' ? trade.entry - trade.exitPrice : trade.exitPrice - trade.entry) * trade.lotSize * pointValue;
      trade.pnlPercent = riskAmount > 0 ? (trade.pnl / riskAmount) * 100 : 0;
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
      Filter, edit, delete, and extend the default trade table without leaving the journal system.
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
      <p>02 - filters</p>
      {#if notice}<span class="status-chip is-active">{notice}</span>{/if}
    </div>
    <div class="card management-panel">
      <div class="form-grid">
        <label><span>from</span><input bind:value={fromDate} type="date" /></label>
        <label><span>to</span><input bind:value={toDate} type="date" /></label>
        <label><span>token</span><input bind:value={pairFilter} type="search" placeholder="BTCUSDT, EURUSD..." /></label>
        <label>
          <span>type</span>
          <CustomSelect bind:value={sideFilter} options={sideFilterOptions} ariaLabel="Filter by side" />
        </label>
        <label><span>notes</span><input bind:value={notesFilter} type="search" placeholder="Search..." /></label>
      </div>
    </div>
  </section>

  <section id="all-trades" class="section-enter">
    <div class="section-heading">
      <p class="heading-with-chip">
        <span>03 - all trades</span>
      </p>
      <div class="section-actions">
        <a class="primary-button compact-button" href="/add-trade">Add Trade</a>
      </div>
    </div>
    <div class="journal-table-wrap card trades-table">
      <table>
        <colgroup>
          <col class="trade-col-date" />
          <col class="trade-col-token" />
          <col class="trade-col-side" />
          <col class="trade-col-price" />
          <col class="trade-col-price" />
          <col class="trade-col-price" />
          <col class="trade-col-risk" />
          <col class="trade-col-small" />
          <col class="trade-col-small" />
          <col class="trade-col-small" />
          <col class="trade-col-result" />
          <col class="trade-col-pnl" />
          {#each visibleCustomColumns as column}
            <col class="trade-col-custom" />
          {/each}
          <col class="trade-col-notes" />
          <col class="trade-col-action" />
        </colgroup>
        <thead>
          <tr>
            <th>Date</th>
            <th>Token</th>
            <th>Side</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>SL</th>
            <th>Risk</th>
            <th>PnL %</th>
            <th>Lots</th>
            <th>RR</th>
            <th>Result</th>
            <th>PnL</th>
            {#each visibleCustomColumns as column}
              <th>{column.label}</th>
            {/each}
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#if filteredTrades.length}
            {#each filteredTrades as trade}
              <tr>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.date || ''} on:input={(event) => saveCellDraft(event, trade.id, 'date')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'date')}>{date(trade.date)}</span></td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.symbol || ''} on:input={(event) => saveCellDraft(event, trade.id, 'symbol')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'symbol')}>{trade.symbol}</span></td>
                <td>
                  <button class={`side-toggle-cell ${trade.direction === 'short' ? 'short' : 'long'}`} type="button" aria-label={`Toggle ${trade.symbol || 'trade'} side`} title="Toggle Side" on:click={() => updateTradeCell(trade.id, 'direction', trade.direction === 'short' ? 'long' : 'short')}>
                    <span aria-hidden="true">{trade.direction === 'short' ? '↓' : '↑'}</span>
                    {trade.direction === 'short' ? 'Short' : 'Long'}
                  </button>
                </td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.entry || ''} on:input={(event) => saveCellDraft(event, trade.id, 'entry')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'entry')}>{number(trade.entry)}</span></td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.exitPrice || ''} on:input={(event) => saveCellDraft(event, trade.id, 'exitPrice')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'exitPrice')}>{trade.exitPrice ? number(trade.exitPrice) : ''}</span></td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.stopPrice || ''} on:input={(event) => saveCellDraft(event, trade.id, 'stopPrice')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'stopPrice')}>{number(trade.stopPrice)}</span></td>
                <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.riskAmount || ''} on:input={(event) => saveCellDraft(event, trade.id, 'riskAmount')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'riskAmount')}>{money(trade.riskAmount)}</span></td>
                <td><span class={`editable-cell ${pnlTone(trade.pnlPercent)}`} contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.pnlPercent || ''} on:input={(event) => saveCellDraft(event, trade.id, 'pnlPercent')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'pnlPercent')}>{Number(trade.pnlPercent || 0).toFixed(2)}%</span></td>
                <td>{Number(trade.lotSize || 0).toFixed(2)}</td>
                <td>{Number(trade.rr || 0).toFixed(2)}R</td>
                <td>
                  <button class={`result-toggle-cell ${trade.result || 'open'}`} type="button" aria-label={`Toggle ${trade.symbol || 'trade'} result`} title="Toggle Result" on:click={() => toggleResult(trade.id, trade.result || 'open')}>
                    <span aria-hidden="true">{resultArrow(trade.result || 'open')}</span>
                    {resultLabel(trade.result || 'open')}
                  </button>
                </td>
                <td><span class={`editable-cell ${pnlTone(getTradePnl(trade))}`} contenteditable="true" role="textbox" tabindex="0" data-original-value={getTradePnl(trade)} on:input={(event) => saveCellDraft(event, trade.id, 'pnl')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'pnl')}>{money(getTradePnl(trade))}</span></td>
                {#each visibleCustomColumns as column}
                  <td><span class="editable-cell" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.customFields?.[column.key] || ''} on:input={(event) => saveCellDraft(event, trade.id, `custom:${column.key}`)} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, `custom:${column.key}`)}>{trade.customFields?.[column.key] || ''}</span></td>
                {/each}
                <td class="notes-cell" title={trade.notes || ''}><span class="editable-cell notes-editor" contenteditable="true" role="textbox" tabindex="0" data-original-value={trade.notes || ''} on:input={(event) => saveCellDraft(event, trade.id, 'notes')} on:keydown={handleCellKey} on:blur={(event) => commitCell(event, trade.id, 'notes')}>{trade.notes || ''}</span></td>
                <td class="row-action-cell">
                  <button class="delete-trade icon-only" type="button" aria-label={`Delete ${trade.symbol || 'trade'}`} title="Delete" on:click={() => askDelete(trade)}>
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 15H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </td>
              </tr>
            {/each}
          {:else}
            <tr><td colspan={14 + visibleCustomColumns.length}>No trades match the current filters.</td></tr>
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
      <h2 id="deleteConfirmTitle">Delete this trade?</h2>
      <p>
        This removes {deleteTarget?.symbol || 'this'} trade.
        This cannot be undone.
      </p>
      <div class="confirm-actions">
        <button class="ghost-button" type="button" on:click={closeConfirm}>Cancel</button>
        <button class="danger-button" type="button" on:click={confirmDelete}>Delete</button>
      </div>
    </div>
  </div>
{/if}
