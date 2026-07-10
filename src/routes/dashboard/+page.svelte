<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';
  import { loadAppSettings } from '$lib/appSettings.js';
  import { saveJournalData } from '$lib/journalActions.js';
  import { date, getTradePnl, loadJournalData, money, number, summarizeJournal } from '$lib/journalData.js';

  let data = { settings: {}, trades: [] };
  let summary = summarizeJournal(data);
  let appSettings = { propFirmEnabled: true };

  onMount(() => {
    data = loadJournalData();
    summary = summarizeJournal(data);
    appSettings = loadAppSettings();
  });

  $: recentTrades = data.trades.slice(0, 5);
  $: equityCurve = buildEquityCurve(data.trades);
  $: personalTargetAmount = Number(data.settings.targetProfitMoney) || (Number(data.settings.capital) || 0) * ((Number(data.settings.targetProfitPercent) || 0) / 100);
  $: personalRiskMoney = (Number(data.settings.capital) || 0) * ((Number(data.settings.riskPercent) || 0) / 100);
  $: displayTargetAmount = appSettings.propFirmEnabled ? summary.targetAmount : personalTargetAmount;
  $: displayProgress = displayTargetAmount > 0 ? Math.max(0, Math.min(100, (summary.totalPnl / displayTargetAmount) * 100)) : 0;
  $: resultDistribution = [
    { label: 'wins', value: summary.wins },
    { label: 'losses', value: summary.losses },
    { label: 'open', value: summary.openTrades }
  ];
  $: maxDistribution = Math.max(1, ...resultDistribution.map((item) => item.value));
  $: signalColumn = data.customColumns?.find((column) => /signal|caller/i.test(column.label) || column.key === 'signal_by' || column.key === 'caller');
  $: pairDistribution = buildCategoryDistribution(data.trades, (trade) => trade.symbol || '0');
  $: pairTotal = pairDistribution.reduce((sum, item) => sum + item.count, 0);
  $: pieSlices = buildPieSlices(pairDistribution, pairTotal);
  $: signalDistribution = signalColumn
    ? buildCategoryDistribution(data.trades, (trade) => trade.customFields?.[signalColumn.key] || trade.caller || trade.signalBy || '')
    : [];
  $: signalTotal = signalDistribution.reduce((sum, item) => sum + item.count, 0);
  $: signalPieSlices = buildPieSlices(signalDistribution, signalTotal);
  let activePair = null;
  let activeSignal = null;
  const pieColors = ['#16a34a', '#22c55e', '#65a30d', '#14b8a6', '#0ea5e9', '#a3e635', '#86efac', '#34d399'];

  function buildEquityCurve(trades) {
    let running = 0;
    const points = trades
      .slice()
      .reverse()
      .map((trade) => {
        running += getTradePnl(trade);
        return running;
      });

    if (!points.length) return "";
    if (points.length === 1) return `0,80 320,${points[0] >= 0 ? 20 : 120}`;

    const min = Math.min(...points, 0);
    const max = Math.max(...points, 0);
    const range = max - min || 1;

    return points
      .map((value, index) => {
        const x = (index / (points.length - 1)) * 320;
        const y = 130 - ((value - min) / range) * 110;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }

  function buildCategoryDistribution(trades, getLabel) {
    const map = new Map();
    trades.forEach((trade) => {
      const label = String(getLabel(trade) || '').trim().toUpperCase();
      if (!label) return;
      const item = map.get(label) || { label, count: 0, rr: 0, wins: 0, closed: 0, winRate: 0 };
      item.count += 1;
      item.rr += Number(trade.rr) || 0;
      if (trade.result && trade.result !== 'open') item.closed += 1;
      if (trade.result === 'win') item.wins += 1;
      item.winRate = item.closed > 0 ? (item.wins / item.closed) * 100 : 0;
      map.set(label, item);
    });
    return [...map.values()].sort((a, b) => b.count - a.count || b.rr - a.rr);
  }

  function buildPieSlices(items, total) {
    if (!items.length || total <= 0) return [];
    let start = 0;
    return items.map((item, index) => {
      const value = item.count / total;
      const end = start + value;
      const slice = {
        ...item,
        color: pieColors[index % pieColors.length],
        path: describeArc(50, 50, 42, start, end)
      };
      start = end;
      return slice;
    });
  }

  function describeArc(cx, cy, r, start, end) {
    const startPoint = polarToCartesian(cx, cy, r, end);
    const endPoint = polarToCartesian(cx, cy, r, start);
    const largeArc = end - start > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${startPoint.x} ${startPoint.y} A ${r} ${r} 0 ${largeArc} 0 ${endPoint.x} ${endPoint.y} Z`;
  }

  function polarToCartesian(cx, cy, r, percent) {
    const angle = percent * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  function savePersonalTarget(field, value, options = {}) {
    const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(parsed)) return;
    const nextSettings = {
      ...(data.settings || {}),
      [field]: parsed
    };
    const next = {
      ...data,
      settings: nextSettings,
      trades: recalculateTradesForSettings(data.trades || [], nextSettings)
    };
    saveJournalData(next, { notify: options.refresh !== false });
    data = next;
    summary = summarizeJournal(next);
  }

  function recalculateTradesForSettings(trades, settings = {}) {
    const accountRiskAmount = (Number(settings.capital) || 0) * ((Number(settings.riskPercent) || 0) / 100);
    const pointValue = Number(settings.pointValue) || 1;

    return trades.map((trade) => {
      const nextTrade = { ...trade };
      const riskAmount = nextTrade.manualRisk ? Number(nextTrade.riskAmount) || 0 : accountRiskAmount;
      const effectivePointValue = Number(nextTrade.pointValue) || pointValue;
      const entry = Number(nextTrade.entry) || 0;
      const exitPrice = Number(nextTrade.exitPrice) || 0;
      const stopPrice = Number(nextTrade.stopPrice) || 0;
      const slPoints = entry > 0 && stopPrice > 0 ? Math.abs(entry - stopPrice) : Number(nextTrade.slPoints) || 0;
      const exitPoints = entry > 0 && exitPrice > 0 ? Math.abs(exitPrice - entry) : 0;

      nextTrade.margin = riskAmount;
      nextTrade.riskAmount = riskAmount;
      nextTrade.pointValue = effectivePointValue;
      nextTrade.slPoints = slPoints;
      nextTrade.lotSize = slPoints > 0 && effectivePointValue > 0 ? riskAmount / (slPoints * effectivePointValue) : 0;
      nextTrade.rr = slPoints > 0 && exitPoints > 0 ? exitPoints / slPoints : Number(nextTrade.rr) || 0;

      if (nextTrade.manualPnl) {
        nextTrade.pnlPercent = riskAmount > 0 ? (Number(nextTrade.pnl) / riskAmount) * 100 : 0;
        return nextTrade;
      }

      if (entry > 0 && exitPrice > 0) {
        nextTrade.pnl = (nextTrade.direction === 'short' ? entry - exitPrice : exitPrice - entry) * nextTrade.lotSize * effectivePointValue;
        nextTrade.pnlPercent = riskAmount > 0 ? (nextTrade.pnl / riskAmount) * 100 : 0;
        nextTrade.result = nextTrade.pnl > 0 ? 'win' : nextTrade.pnl < 0 ? 'loss' : 'breakeven';
      } else if (nextTrade.result === 'loss') {
        nextTrade.pnl = -riskAmount;
        nextTrade.pnlPercent = -100;
      } else if (nextTrade.result === 'breakeven') {
        nextTrade.pnl = 0;
        nextTrade.pnlPercent = 0;
      }

      return nextTrade;
    });
  }

  function commitPersonalTarget(event, field) {
    savePersonalTarget(field, event.currentTarget.textContent || '');
  }

  function inputPersonalTarget(event, field) {
    savePersonalTarget(field, event.currentTarget.textContent || '', { refresh: false });
  }

  function handleEditableKey(event) {
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
  <title>Dashboard | MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/dashboard" />

<main id="top" class="page-shell">
  <section class="hero section-enter">
    <div class="halftone" aria-hidden="true"></div>
    <p class="eyebrow">overview</p>
    <h1>dashboard.</h1>
    <p class="lede">
      Account progress, target health, and trade performance pulled from the
      same saved journal data as the main app.
    </p>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>01 - performance</p>
      <span class="status-chip">{appSettings.propFirmEnabled ? `${summary.activePhase} beta` : 'personal'}</span>
    </div>
    <div class="stats-grid dashboard-stats">
      <div><span>{appSettings.propFirmEnabled ? 'challenge beta pnl' : 'performance pnl'}</span><strong class:pnl-positive={summary.totalPnl > 0} class:pnl-negative={summary.totalPnl < 0}>{money(summary.totalPnl)}</strong></div>
      <div><span>{appSettings.propFirmEnabled ? 'beta target progress' : 'profit target'}</span><strong>{displayProgress.toFixed(0)}%</strong></div>
      <div><span>win rate</span><strong>{summary.winRate.toFixed(0)}%</strong></div>
      <div><span>total trades</span><strong>{summary.totalTrades}</strong></div>
    </div>
    <div class="progress-shell" aria-label="Challenge beta target progress">
      <div style={`width: ${displayProgress}%`}></div>
    </div>
  </section>

  <section id="rules" class="section-enter" class:hidden-panel={!appSettings.propFirmEnabled}>
    <div class="section-heading">
      <p>02 - challenge beta</p>
    </div>
    <div class="stats-grid dashboard-stats">
      <div><span>capital</span><strong>{money(summary.capital)}</strong></div>
      <div><span>target</span><strong>{summary.targetPercent}%</strong></div>
      <div><span>target amount</span><strong>{money(summary.targetAmount)}</strong></div>
      <div><span>open trades</span><strong>{summary.openTrades}</strong></div>
    </div>
  </section>

  <section class="section-enter" class:hidden-panel={appSettings.propFirmEnabled}>
    <div class="section-heading">
      <p>02 - personal targets</p>
    </div>
    <div class="stats-grid dashboard-stats">
      <div><span>capital</span><span class="editable-stat" contenteditable="true" role="textbox" tabindex="0" data-original-value={summary.capital} on:input={(event) => inputPersonalTarget(event, 'capital')} on:keydown={handleEditableKey} on:blur={(event) => commitPersonalTarget(event, 'capital')}>{money(summary.capital)}</span></div>
      <div><span>risk %</span><span class="editable-stat" contenteditable="true" role="textbox" tabindex="0" data-original-value={data.settings.riskPercent || 0} on:input={(event) => inputPersonalTarget(event, 'riskPercent')} on:keydown={handleEditableKey} on:blur={(event) => commitPersonalTarget(event, 'riskPercent')}>{Number(data.settings.riskPercent || 0)}%</span></div>
      <div><span>risk money</span><strong class="editable-stat is-computed">{money(personalRiskMoney)}</strong></div>
      <div><span>target profit</span><span class="editable-stat" contenteditable="true" role="textbox" tabindex="0" data-original-value={personalTargetAmount} on:input={(event) => inputPersonalTarget(event, 'targetProfitMoney')} on:keydown={handleEditableKey} on:blur={(event) => commitPersonalTarget(event, 'targetProfitMoney')}>{money(personalTargetAmount)}</span></div>
    </div>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>03 - charts</p>
    </div>
    <div class="chart-grid">
      <div class="card chart-card">
        <div class="chart-heading">
          <span>equity curve</span>
          <strong>{money(summary.totalPnl)}</strong>
        </div>
        {#if equityCurve}
          <svg class="line-chart" viewBox="0 0 320 150" role="img" aria-label="Equity curve">
            <line x1="0" y1="130" x2="320" y2="130" />
            <polyline points={equityCurve} />
          </svg>
        {:else}
          <p class="empty-state">No equity data yet.</p>
        {/if}
      </div>

      <div class="card chart-card">
        <div class="chart-heading">
          <span>trade results</span>
          <strong>{summary.totalTrades}</strong>
        </div>
        <div class="bar-chart">
          {#each resultDistribution as item}
            <div class="bar-row">
              <span>{item.label}</span>
              <div class="bar-track">
                <div style={`width: ${(item.value / maxDistribution) * 100}%`}></div>
              </div>
              <strong>{item.value}</strong>
            </div>
          {/each}
        </div>
      </div>

      <div class="card chart-card">
        <div class="chart-heading">
          <span>pairs / tokens</span>
          <strong>{pairDistribution.length}</strong>
        </div>
        {#if pieSlices.length}
          <div class="pie-chart-layout">
            <svg class="pie-chart" viewBox="0 0 100 100" role="img" aria-label="Pairs and tokens traded">
              {#each pieSlices as slice}
                <path
                  d={slice.path}
                  fill={slice.color}
                  role="img"
                  aria-label={`${slice.label}: ${slice.count} trades, ${slice.rr.toFixed(2)}R`}
                  on:mouseenter={() => (activePair = slice)}
                  on:mouseleave={() => (activePair = null)}
                >
                  <title>{slice.label}: {slice.count} trades, {slice.rr.toFixed(2)}R</title>
                </path>
              {/each}
              <circle cx="50" cy="50" r="23" />
            </svg>
            <div class="pie-tooltip">
              {#if activePair}
                <strong>{activePair.label}</strong>
                <span>{activePair.count} trade{activePair.count === 1 ? '' : 's'}</span>
                <span>{activePair.rr.toFixed(2)}R total</span>
              {:else}
                <strong>hover a slice</strong>
                <span>trade count</span>
                <span>total rr gain</span>
              {/if}
            </div>
          </div>
          <div class="pie-legend">
            {#each pieSlices as slice}
              <span><i style={`background: ${slice.color}`}></i>{slice.label}</span>
            {/each}
          </div>
        {:else}
          <p class="empty-state">No pair data yet.</p>
        {/if}
      </div>

      {#if signalColumn}
        <div class="card chart-card">
          <div class="chart-heading">
          <span>caller</span>
            <strong>{signalDistribution.length}</strong>
          </div>
          {#if signalPieSlices.length}
            <div class="pie-chart-layout">
              <svg class="pie-chart" viewBox="0 0 100 100" role="img" aria-label="Caller performance">
                {#each signalPieSlices as slice}
                  <path
                    d={slice.path}
                    fill={slice.color}
                    role="img"
                    aria-label={`${slice.label}: ${slice.count} trades, ${slice.rr.toFixed(2)}R, ${slice.winRate.toFixed(0)}% win rate`}
                    on:mouseenter={() => (activeSignal = slice)}
                    on:mouseleave={() => (activeSignal = null)}
                  >
                    <title>{slice.label}: {slice.count} trades, {slice.rr.toFixed(2)}R, {slice.winRate.toFixed(0)}% win rate</title>
                  </path>
                {/each}
                <circle cx="50" cy="50" r="23" />
              </svg>
              <div class="pie-tooltip">
                {#if activeSignal}
                  <strong>{activeSignal.label}</strong>
                  <span>{activeSignal.count} trade{activeSignal.count === 1 ? '' : 's'}</span>
                  <span>{activeSignal.rr.toFixed(2)}R total</span>
                  <span>{activeSignal.winRate.toFixed(0)}% win rate</span>
                {:else}
                  <strong>hover a slice</strong>
                  <span>trade count</span>
                  <span>rr and win rate</span>
                {/if}
              </div>
            </div>
            <div class="pie-legend">
              {#each signalPieSlices as slice}
                <span><i style={`background: ${slice.color}`}></i>{slice.label}</span>
              {/each}
            </div>
          {:else}
            <p class="empty-state">No signal data yet.</p>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>04 - recent trades</p>
      <a class="ghost-button" href="/trades">View All</a>
    </div>
    <div class="journal-table-wrap card">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Pair</th>
            <th>Side</th>
            <th>Entry</th>
            <th>RR</th>
            <th>PnL</th>
          </tr>
        </thead>
        <tbody>
          {#if recentTrades.length}
            {#each recentTrades as trade}
              <tr>
                <td>{date(trade.date)}</td>
                <td>{trade.symbol}</td>
                <td>{trade.direction}</td>
                <td>{number(trade.entry)}</td>
                <td>{Number(trade.rr || 0).toFixed(2)}R</td>
                <td class:pnl-positive={getTradePnl(trade) > 0} class:pnl-negative={getTradePnl(trade) < 0}>{money(getTradePnl(trade))}</td>
              </tr>
            {/each}
          {:else}
            <tr><td colspan="6">No trades saved yet.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</main>

