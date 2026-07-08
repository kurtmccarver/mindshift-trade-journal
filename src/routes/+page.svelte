<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';

  onMount(async () => {
    const { initTradeJournal } = await import('$lib/tradeJournal.js');
    return initTradeJournal();
  });
</script>

<svelte:head>
  <title>MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/" />

<main id="top" class="page-shell">
  <section class="hero section-enter">
    <div class="halftone" aria-hidden="true"></div>
    <p class="eyebrow">trader operating system</p>
    <h1>trade tracker.</h1>
    <p class="lede">
      Targets, live market pricing, automatic lot sizing, RR, gain, custom
      notes, and an editable journal in one minimal dashboard.
    </p>
  </section>

  <section id="rules" class="section-enter">
    <div class="section-heading">
      <p>01 - rules</p>
    </div>
    <div class="card challenge-card">
      <div class="form-grid">
        <label><span>account capital</span><input id="capital" type="number" min="0" step="100" /></label>
        <label><span>risk per trade %</span><input id="riskPercent" type="number" min="0" step="0.1" /></label>
        <label>
          <span>phase</span>
          <select id="activePhase">
            <option value="phase1">Phase 1</option>
            <option value="phase2">Phase 2</option>
            <option value="funded">Funded</option>
          </select>
        </label>
        <label><span>starting date</span><input id="startDate" type="date" /></label>
      </div>

      <div class="phase-grid" aria-label="Prop firm phases">
        <article class="phase-panel" data-phase-panel="phase1">
          <p class="micro">phase 1</p>
          <label><span>target %</span><input id="phase1Target" type="number" min="0" step="0.1" /></label>
          <label><span>max daily loss %</span><input id="phase1DailyLoss" type="number" min="0" step="0.1" /></label>
          <label><span>max total loss %</span><input id="phase1TotalLoss" type="number" min="0" step="0.1" /></label>
          <div class="pretty p-svg p-curve p-thick app-checkbox">
            <input id="phase1Complete" type="checkbox" />
            <div class="state p-primary">
              <svg class="svg svg-icon" viewBox="0 0 20 20"><path d="M7.6 14.2 3.8 10.4 5.2 9l2.4 2.4 7.2-7.2 1.4 1.4z" /></svg>
              <label for="phase1Complete">completed</label>
            </div>
          </div>
        </article>
        <article class="phase-panel" data-phase-panel="phase2">
          <p class="micro">phase 2</p>
          <label><span>target %</span><input id="phase2Target" type="number" min="0" step="0.1" /></label>
          <label><span>max daily loss %</span><input id="phase2DailyLoss" type="number" min="0" step="0.1" /></label>
          <label><span>max total loss %</span><input id="phase2TotalLoss" type="number" min="0" step="0.1" /></label>
          <div class="pretty p-svg p-curve p-thick app-checkbox">
            <input id="phase2Complete" type="checkbox" />
            <div class="state p-primary">
              <svg class="svg svg-icon" viewBox="0 0 20 20"><path d="M7.6 14.2 3.8 10.4 5.2 9l2.4 2.4 7.2-7.2 1.4 1.4z" /></svg>
              <label for="phase2Complete">completed</label>
            </div>
          </div>
        </article>
        <article class="phase-panel" data-phase-panel="funded">
          <p class="micro">funded</p>
          <label><span>profit goal %</span><input id="fundedTarget" type="number" min="0" step="0.1" /></label>
          <label><span>max daily loss %</span><input id="fundedDailyLoss" type="number" min="0" step="0.1" /></label>
          <label><span>max total loss %</span><input id="fundedTotalLoss" type="number" min="0" step="0.1" /></label>
          <div class="pretty p-svg p-curve p-thick app-checkbox">
            <input id="fundedComplete" type="checkbox" />
            <div class="state p-primary">
              <svg class="svg svg-icon" viewBox="0 0 20 20"><path d="M7.6 14.2 3.8 10.4 5.2 9l2.4 2.4 7.2-7.2 1.4 1.4z" /></svg>
              <label for="fundedComplete">payout ready</label>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section id="personalTargets" class="section-enter">
    <div class="section-heading">
      <p>01 - targets</p>
    </div>
    <div class="card">
      <div class="form-grid">
        <label><span>capital</span><input id="personalCapitalMirror" type="number" min="0" step="100" data-mirror-source="capital" /></label>
        <label><span>risk %</span><input id="personalRiskPercentMirror" type="number" min="0" step="0.1" data-mirror-source="riskPercent" /></label>
        <label><span>risk money</span><input id="riskMoney" class="computed-input" type="text" readonly aria-readonly="true" /></label>
        <label><span>target profit %</span><input id="targetProfitPercent" type="number" min="0" step="0.1" /></label>
        <label><span>target profit money</span><input id="targetProfitMoney" type="number" min="0" step="1" /></label>
      </div>
    </div>
  </section>

  <section id="calculator" class="section-enter">
    <div class="section-heading">
      <p>02 - calculator</p>
      <span id="priceStatus" class="status-chip">live price waiting</span>
    </div>
    <div class="card">
      <div class="calculator-group">
        <p class="micro">market</p>
        <div class="market-ticker">
          <label>
            <span>pair / token</span>
            <input id="marketSearch" type="search" placeholder="Search BTC, EURUSD, NASDAQ, AAPL, gold..." autocomplete="off" />
          </label>
          <div class="live-price-field">
            <span>live price</span>
            <input id="livePrice" class="live-price-panel" type="number" min="0" step="0.00000001" placeholder="--" />
          </div>
          <label>
            <span>exchange</span>
            <select id="priceProvider">
              <option value="auto">Auto source</option>
              <option value="binance">Binance</option>
              <option value="bitget">Bitget</option>
              <option value="okx">OKX</option>
              <option value="lbank">LBank</option>
              <option value="mexc">MEXC</option>
            </select>
          </label>
          <label>
            <span>price market</span>
            <select id="priceMarket">
              <option value="spot">Spot</option>
              <option value="perp">Perpetual</option>
            </select>
          </label>
          <label>
            <span>type</span>
            <select id="marketFilter">
              <option value="all">All markets</option>
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
              <option value="index">Indices</option>
              <option value="stock">Stocks</option>
              <option value="etf">ETFs</option>
            </select>
          </label>
        </div>
        <input id="symbol" type="hidden" />
        <div class="search-results" id="searchResults" aria-live="polite"></div>
        <p class="price-source" id="priceSource">Search uses exchange APIs, spot and perpetual futures sources, Yahoo Finance, and CoinGecko tokens. Enter the live price manually if a public source is unavailable.</p>
      </div>

      <div class="calculator-group">
        <p class="micro">trade setup</p>
        <div class="form-grid">
          <label><span>trade date</span><input id="tradeDate" type="date" /></label>
          <label><span>entry price</span><input id="entryPrice" type="number" min="0" step="0.00001" /></label>
          <label><span>exit price</span><input id="exitPrice" type="number" min="0" step="0.00001" placeholder="optional" /></label>
          <label>
            <span>measurement</span>
            <select id="measurementMode">
              <option value="points">Points</option>
              <option value="price">Actual price</option>
            </select>
          </label>
          <label>
            <span>direction</span>
            <select id="direction">
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
          <label>
            <span>trade result</span>
            <select id="result">
              <option value="open">Open</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </label>
          <input id="signalBy" type="hidden" />
        </div>
      </div>

      <div class="calculator-group">
        <p class="micro">risk and targets</p>
        <div class="form-grid">
          <label><span id="slLabel">stop loss points</span><input id="slPoints" type="number" min="0" step="0.00001" /></label>
          <label><span id="tp1Label">TP1 points optional</span><input id="tp1Points" type="number" min="0" step="0.00001" placeholder="optional" /></label>
          <label><span id="tp2Label">TP2 points optional</span><input id="tp2Points" type="number" min="0" step="0.00001" placeholder="optional" /></label>
          <label><span>point value / lot</span><input id="pointValue" type="number" min="0" step="0.01" /></label>
        </div>
      </div>

      <div class="custom-field-panel" id="customFieldPanel" hidden>
        <p class="micro">custom columns</p>
        <div class="form-grid" id="customFieldGrid"></div>
      </div>

      <div class="stats-grid calculator-stats">
        <div><span>risk amount</span><strong id="riskAmount">$0.00</strong></div>
        <div><span>lot size</span><strong id="lotSize">0.00</strong></div>
        <div><span>rr gain</span><strong id="rrGain">0.00R</strong></div>
        <div><span>estimated gain</span><strong id="estimatedGain">$0.00</strong></div>
        <div><span>auto pnl</span><strong id="autoPnl">$0.00</strong></div>
      </div>

      <div class="calculator-group">
        <p class="micro">journal</p>
        <label class="notes-label">
          <span>journal notes</span>
          <textarea id="notes" rows="4" placeholder="Setup, emotions, execution, screenshot link..."></textarea>
        </label>
      </div>
      <div class="action-row">
        <button class="primary-button wide" id="addTrade" type="button">add trade to journal</button>
        <button class="ghost-button" id="cancelEdit" type="button" hidden>cancel edit</button>
      </div>
    </div>
  </section>

  <section id="analytics" class="section-enter">
    <div class="section-heading"><p>03 - analytics</p></div>
    <div class="stats-grid dashboard-stats">
      <div><span id="pnlLabel">challenge pnl</span><strong id="totalPnl">$0.00</strong></div>
      <div><span id="targetProgressLabel">target progress</span><strong id="targetProgress">0%</strong></div>
      <div><span>win rate</span><strong id="winRate">0%</strong></div>
      <div><span>total trades</span><strong id="tradeCount">0</strong></div>
    </div>
    <div class="progress-shell" aria-label="Challenge target progress"><div id="progressBar"></div></div>
  </section>

  <section id="journal" class="section-enter">
    <div class="section-heading">
      <p>04 - journal</p>
      <button class="ghost-button" id="addJournalRow" type="button">add trade</button>
    </div>
    <div class="journal-table-wrap card">
      <table>
        <thead>
          <tr id="journalHeadRow"></tr>
        </thead>
        <tbody id="tradeRows"></tbody>
      </table>
      <p id="emptyState" class="empty-state">No trades yet. Add one from the calculator.</p>
    </div>
  </section>
</main>

<div class="toast-stack" id="toastStack" aria-live="polite" aria-atomic="false"></div>

<div class="confirm-overlay" id="confirmOverlay" hidden>
  <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
    <p class="micro">confirmation</p>
    <h2 id="confirmTitle">Are you sure?</h2>
    <p id="confirmMessage">This action cannot be undone.</p>
    <div class="confirm-actions">
      <button class="ghost-button" id="confirmCancel" type="button">cancel</button>
      <button class="danger-button" id="confirmOk" type="button">confirm</button>
    </div>
  </div>
</div>
