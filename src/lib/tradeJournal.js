import { applyAppSettings, formatDate, formatMoney, loadAppSettings } from "./appSettings.js";
import { isAllowedExchange } from "./exchangeConfig.js";

const STORAGE_KEY = "minimal-trade-journal:v2";
const LEGACY_KEY = "minimal-trade-journal:v1";

const defaults = {
  settings: {
    capital: 10000,
    riskPercent: 1,
    riskMoney: 100,
    targetProfitPercent: 10,
    targetProfitMoney: 1000,
    activePhase: "phase1",
    startDate: new Date().toISOString().slice(0, 10),
    phase1Target: 8,
    phase1DailyLoss: 5,
    phase1TotalLoss: 10,
    phase1Complete: false,
    phase2Target: 5,
    phase2DailyLoss: 5,
    phase2TotalLoss: 10,
    phase2Complete: false,
    fundedTarget: 10,
    fundedDailyLoss: 5,
    fundedTotalLoss: 10,
    fundedComplete: false,
    symbol: "BTCUSDT",
    priceProvider: "auto",
    priceMarket: "spot",
    tradeDate: new Date().toISOString().slice(0, 10),
    entryPrice: "",
    exitPrice: "",
    measurementMode: "points",
    slPoints: 100,
    tp1Points: 200,
    tp2Points: "",
    signalBy: "",
    pointValue: 1,
    direction: "long",
    result: "open",
    notes: "",
    customFieldValues: {},
  },
  trades: [],
  customColumns: [],
  selectedMarket: null,
  theme: "system",
};

const fields = [
  "capital",
  "riskPercent",
  "riskMoney",
  "targetProfitPercent",
  "targetProfitMoney",
  "activePhase",
  "startDate",
  "phase1Target",
  "phase1DailyLoss",
  "phase1TotalLoss",
  "phase1Complete",
  "phase2Target",
  "phase2DailyLoss",
  "phase2TotalLoss",
  "phase2Complete",
  "fundedTarget",
  "fundedDailyLoss",
  "fundedTotalLoss",
  "fundedComplete",
  "symbol",
  "priceProvider",
  "priceMarket",
  "tradeDate",
  "entryPrice",
  "exitPrice",
  "measurementMode",
  "slPoints",
  "tp1Points",
  "tp2Points",
  "signalBy",
  "pointValue",
  "direction",
  "result",
  "notes",
];

const coinGeckoIds = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  SOLUSDT: "solana",
  XRPUSDT: "ripple",
  BNBUSDT: "binancecoin",
  ADAUSDT: "cardano",
  AVAXUSDT: "avalanche-2",
  LINKUSDT: "chainlink",
  DOGEUSDT: "dogecoin",
  MATICUSDT: "matic-network",
};

const money = { format: (value) => formatMoney(value) };

let state = loadState();
let editingTradeId = null;
let priceTimer = null;
let symbolDebounce = null;
let searchDebounce = null;
let searchRequestId = 0;
const marketSearchCache = new Map();
let confirmResolver = null;
const notifiedCompletions = new Set();

const fallbackMarkets = [
  { symbol: "BTCUSDT", name: "Bitcoin / Tether", type: "crypto", source: "Binance" },
  { symbol: "ETHUSDT", name: "Ethereum / Tether", type: "crypto", source: "Binance" },
  { symbol: "SOLUSDT", name: "Solana / Tether", type: "crypto", source: "Binance" },
  { symbol: "XRPUSDT", name: "XRP / Tether", type: "crypto", source: "Binance" },
  { symbol: "EURUSD=X", name: "Euro / US Dollar", type: "forex", source: "Yahoo" },
  { symbol: "GBPUSD=X", name: "British Pound / US Dollar", type: "forex", source: "Yahoo" },
  { symbol: "USDJPY=X", name: "US Dollar / Japanese Yen", type: "forex", source: "Yahoo" },
  { symbol: "AUDUSD=X", name: "Australian Dollar / US Dollar", type: "forex", source: "Yahoo" },
  { symbol: "USDCAD=X", name: "US Dollar / Canadian Dollar", type: "forex", source: "Yahoo" },
  { symbol: "USDCHF=X", name: "US Dollar / Swiss Franc", type: "forex", source: "Yahoo" },
  { symbol: "NZDUSD=X", name: "New Zealand Dollar / US Dollar", type: "forex", source: "Yahoo" },
  { symbol: "EURJPY=X", name: "Euro / Japanese Yen", type: "forex", source: "Yahoo" },
  { symbol: "EURGBP=X", name: "Euro / British Pound", type: "forex", source: "Yahoo" },
  { symbol: "XAUUSD=X", name: "Gold Spot / US Dollar", type: "forex", source: "Yahoo" },
  { symbol: "^GSPC", name: "S&P 500 Index", type: "index", source: "Yahoo" },
  { symbol: "^IXIC", name: "Nasdaq Composite", type: "index", source: "Yahoo" },
  { symbol: "^DJI", name: "Dow Jones Industrial Average", type: "index", source: "Yahoo" },
  { symbol: "^RUT", name: "Russell 2000", type: "index", source: "Yahoo" },
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", source: "Yahoo" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "stock", source: "Yahoo" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock", source: "Yahoo" },
  { symbol: "TSLA", name: "Tesla, Inc.", type: "stock", source: "Yahoo" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "etf", source: "Yahoo" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", type: "etf", source: "Yahoo" },
];

function $(id) {
  return document.getElementById(id);
}

function bindClick(id, handler) {
  const el = $(id);
  if (el) el.addEventListener("click", handler);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  if (!saved) return structuredClone(defaults);

  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaults),
      ...parsed,
      settings: { ...defaults.settings, ...parsed.settings },
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
      customColumns: Array.isArray(parsed.customColumns) ? parsed.customColumns : [],
      selectedMarket: parsed.selectedMarket || null,
    };
  } catch {
    return structuredClone(defaults);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function numberValue(id) {
  return Number($(id)?.value) || 0;
}

function readSettingsFromDom() {
  for (const id of fields) {
    const el = $(id);
    if (!el) continue;
    state.settings[id] = el.type === "checkbox" ? el.checked : el.value;
  }
  saveState();
}

function writeSettingsToDom() {
  for (const id of fields) {
    const el = $(id);
    if (!el) continue;
    const value = state.settings[id];
    if (el.type === "checkbox") {
      el.checked = Boolean(value);
    } else {
      el.value = value ?? "";
    }
  }
  if ($("marketSearch")) $("marketSearch").value = state.settings.symbol || "";
  document.querySelectorAll("[data-mirror-source]").forEach((mirror) => {
    mirror.value = state.settings[mirror.dataset.mirrorSource] ?? "";
  });
}

function getCalculator() {
  const capital = numberValue("capital");
  const riskPercent = numberValue("riskPercent");
  const riskMoney = numberValue("riskMoney");
  const rawSl = numberValue("slPoints");
  const rawTp1 = numberValue("tp1Points");
  const rawTp2 = numberValue("tp2Points");
  const pointValue = numberValue("pointValue");
  const entry = numberValue("entryPrice");
  const exit = numberValue("exitPrice");
  const direction = $("direction").value;
  const measurementMode = $("measurementMode").value;

  let slPoints = rawSl;
  let tp1Points = rawTp1;
  let tp2Points = rawTp2;
  let stopPrice = direction === "long" ? entry - rawSl : entry + rawSl;
  let takeProfit1 = rawTp1 > 0 ? (direction === "long" ? entry + rawTp1 : entry - rawTp1) : 0;
  let takeProfit2 = rawTp2 > 0 ? (direction === "long" ? entry + rawTp2 : entry - rawTp2) : 0;

  if (measurementMode === "price") {
    stopPrice = rawSl;
    takeProfit1 = rawTp1;
    takeProfit2 = rawTp2;
    slPoints = Math.abs(entry - stopPrice);
    tp1Points = rawTp1 > 0 ? Math.abs(takeProfit1 - entry) : 0;
    tp2Points = rawTp2 > 0 ? Math.abs(takeProfit2 - entry) : 0;
  }

  const appSettings = loadAppSettings();
  const riskAmount = appSettings.propFirmEnabled ? capital * (riskPercent / 100) : riskMoney || capital * (riskPercent / 100);
  const lotSize = slPoints > 0 && pointValue > 0 ? riskAmount / (slPoints * pointValue) : 0;
  const targetPoints = tp1Points || tp2Points || 0;
  const rr = slPoints > 0 && targetPoints > 0 ? targetPoints / slPoints : 0;
  const gain = riskAmount * rr;
  const autoPnl = exit > 0 && entry > 0
    ? (direction === "long" ? exit - entry : entry - exit) * lotSize * pointValue
    : 0;

  return {
    capital,
    riskPercent,
    measurementMode,
    rawSl,
    rawTp1,
    rawTp2,
    slPoints,
    tp1Points,
    tp2Points,
    targetPoints,
    pointValue,
    entry,
    exit,
    riskAmount,
    lotSize,
    rr,
    gain,
    autoPnl,
    stopPrice,
    takeProfit1,
    takeProfit2,
  };
}

function getTradePnl(trade) {
  if (trade.pnl !== null && trade.pnl !== undefined && trade.pnl !== "") {
    return Number(trade.pnl) || 0;
  }
  if (Number(trade.exitPrice) > 0) {
    return Number(trade.pnl) || 0;
  }
  if (trade.result === "win") return trade.estimatedGain;
  if (trade.result === "loss") return -trade.riskAmount;
  return 0;
}

function activeTargetAmount() {
  const appSettings = loadAppSettings();
  if (!appSettings.propFirmEnabled) {
    const explicitTarget = Number(state.settings.targetProfitMoney) || 0;
    if (explicitTarget > 0) return explicitTarget;
    return (Number(state.settings.capital) || 0) * ((Number(state.settings.targetProfitPercent) || 0) / 100);
  }
  const phase = state.settings.activePhase;
  const targetPercent = Number(state.settings[`${phase}Target`]) || 0;
  return (Number(state.settings.capital) || 0) * (targetPercent / 100);
}

function updateCalculator() {
  const calc = getCalculator();
  const priceMode = $("measurementMode").value === "price";
  $("slLabel").textContent = priceMode ? "stop loss price" : "stop loss points";
  $("tp1Label").textContent = priceMode ? "TP1 price optional" : "TP1 points optional";
  $("tp2Label").textContent = priceMode ? "TP2 price optional" : "TP2 points optional";
  $("riskAmount").textContent = money.format(calc.riskAmount);
  $("lotSize").textContent = calc.lotSize.toFixed(2);
  $("rrGain").textContent = `${calc.rr.toFixed(2)}R`;
  $("estimatedGain").textContent = money.format(calc.gain);
  $("autoPnl").textContent = money.format(calc.autoPnl);
}

function setManualPriceNeeded(message) {
  const livePrice = $("livePrice");
  if (livePrice) {
    livePrice.classList.add("needs-manual-price");
    livePrice.placeholder = "enter price";
    livePrice.value = "";
  }
  setStatus(message);
}

function updatePhasePanels() {
  document.querySelectorAll("[data-phase-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.phasePanel === state.settings.activePhase);
  });
}

function updateAnalytics() {
  const appSettings = loadAppSettings();
  const totalPnl = state.trades.reduce((sum, trade) => sum + getTradePnl(trade), 0);
  const closedTrades = state.trades.filter((trade) => trade.result !== "open");
  const wins = state.trades.filter((trade) => trade.result === "win").length;
  const winRate = closedTrades.length ? (wins / closedTrades.length) * 100 : 0;
  const target = activeTargetAmount();
  const progress = target > 0 ? Math.max(0, Math.min(100, (totalPnl / target) * 100)) : 0;

  $("totalPnl").textContent = money.format(totalPnl);
  if ($("pnlLabel")) $("pnlLabel").textContent = appSettings.propFirmEnabled ? "challenge pnl" : "performance pnl";
  if ($("targetProgressLabel")) $("targetProgressLabel").textContent = appSettings.propFirmEnabled ? "target progress" : "profit target";
  $("targetProgress").textContent = `${progress.toFixed(0)}%`;
  $("winRate").textContent = `${winRate.toFixed(0)}%`;
  $("tradeCount").textContent = String(state.trades.length);
  $("progressBar").style.width = `${progress}%`;

  const completionKey = `${state.settings.activePhase}Complete`;
  if (progress >= 100 && !state.settings[completionKey]) {
    state.settings[completionKey] = true;
    const checkbox = $(completionKey);
    if (checkbox) checkbox.checked = true;
    saveState();
    if (!notifiedCompletions.has(completionKey)) {
      notifiedCompletions.add(completionKey);
      notify(`${state.settings.activePhase.replace("phase", "phase ")} target reached`);
    }
  }
}

function notify(message) {
  const stack = $("toastStack");
  if (!stack) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 220);
  }, 3600);
}

function renderTrades() {
  const rows = $("tradeRows");
  renderJournalHeader();
  rows.innerHTML = "";

  state.trades.forEach((trade) => {
    const row = document.createElement("tr");
    row.dataset.tradeRow = trade.id;
    const slTp = trade.measurementMode === "price"
      ? `${formatNumber(trade.stopPrice)} / ${formatOptionalNumber(trade.takeProfit1 || trade.takeProfit)} / ${formatOptionalNumber(trade.takeProfit2)}`
      : `${formatNumber(trade.slPoints)} / ${formatOptionalNumber(trade.tp1Points || trade.tpPoints)} / ${formatOptionalNumber(trade.tp2Points)}`;
    row.innerHTML = `
      <td>${editableCell(trade.id, "date", trade.date || new Date().toISOString().slice(0, 10))}</td>
      <td>${editableCell(trade.id, "symbol", trade.symbol || "MANUAL")}</td>
      <td>${sideSelect(trade.id, trade.direction || "long")}</td>
      <td>${editableCell(trade.id, "entry", formatNumber(trade.entry))}</td>
      <td>${editableCell(trade.id, "exitPrice", trade.exitPrice ? formatNumber(trade.exitPrice) : "")}</td>
      <td>${editableCell(trade.id, "slTp", slTp)}</td>
      <td><span class="computed-cell">${Number(trade.lotSize || 0).toFixed(2)}</span></td>
      <td><span class="computed-cell">${Number(trade.rr || 0).toFixed(2)}R</span></td>
      <td>${editableCell(trade.id, "pnl", money.format(getTradePnl(trade)), pnlClass(getTradePnl(trade)))}</td>
      <td class="notes-cell" title="${escapeHtml(trade.notes || "")}">${editableCell(trade.id, "notes", trade.notes || "")}</td>
      ${state.customColumns.map((column) => `<td>${editableCell(trade.id, `custom:${column.key}`, trade.customFields?.[column.key] || "")}</td>`).join("")}
    `;
    rows.appendChild(row);
  });

  $("emptyState").hidden = state.trades.length > 0;
}

function editableCell(tradeId, field, value, extraClass = "") {
  const noteClass = field === "notes" ? " notes-editor" : "";
  const classes = ["editable-cell", noteClass.trim(), extraClass].filter(Boolean).join(" ");
  return `<span class="${classes}" contenteditable="true" role="textbox" spellcheck="false" data-cell-trade="${escapeHtml(tradeId)}" data-cell-field="${escapeHtml(field)}">${escapeHtml(normalizeCellValue(value))}</span>`;
}

function pnlClass(value) {
  const pnl = Number(value) || 0;
  if (pnl > 0) return "pnl-positive";
  if (pnl < 0) return "pnl-negative";
  return "";
}

function sideSelect(tradeId, value) {
  const direction = value === "short" ? "short" : "long";
  return `
    <select class="table-select" data-side-trade="${escapeHtml(tradeId)}" aria-label="Trade side">
      <option value="long"${direction === "long" ? " selected" : ""}>Long</option>
      <option value="short"${direction === "short" ? " selected" : ""}>Short</option>
    </select>
  `;
}

function normalizeCellValue(value) {
  return value === null || value === undefined || value === "-" ? "" : String(value);
}

function renderJournalHeader() {
  const row = $("journalHeadRow");
  if (!row) return;
  const baseHeaders = ["Date", "Pair", "Side", "Entry", "Exit", "SL / TP1 / TP2", "Lots", "RR", "PnL", "Notes"];
  row.innerHTML = [
    ...baseHeaders.map((label) => `<th>${label}</th>`),
    ...state.customColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`),
  ].join("");
}

function renderCustomColumnTools() {
  const list = $("customColumnList");
  if (!list) return;
  list.innerHTML = "";

  if (!state.customColumns.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No custom columns yet.";
    list.appendChild(empty);
    return;
  }

  state.customColumns.forEach((column) => {
    const pill = document.createElement("span");
    pill.className = "column-pill";
    pill.innerHTML = `
      <span>${escapeHtml(column.label)}</span>
      <button class="delete-custom-column" type="button" data-column-delete="${column.key}" aria-label="Remove ${escapeHtml(column.label)} column">remove</button>
    `;
    list.appendChild(pill);
  });
}

function renderCustomFieldInputs() {
  const panel = $("customFieldPanel");
  const grid = $("customFieldGrid");
  if (!panel || !grid) return;

  panel.hidden = state.customColumns.length === 0;
  grid.innerHTML = "";

  state.customColumns.forEach((column) => {
    const label = document.createElement("label");
    const value = state.settings.customFieldValues?.[column.key] || "";
    label.innerHTML = `
      <span>${escapeHtml(column.label)}</span>
      <input data-custom-field="${column.key}" type="text" maxlength="80" value="${escapeHtml(value)}" placeholder="${escapeHtml(column.label)}" />
    `;
    grid.appendChild(label);
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 5 });
}

function formatOptionalNumber(value) {
  return Number(value) > 0 ? formatNumber(value) : "-";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function render() {
  updateCalculator();
  updatePhasePanels();
  updateAnalytics();
  renderCustomFieldInputs();
  renderCustomColumnTools();
  renderTrades();
  enhanceSelects();
  refreshCustomSelects();
}

function enhanceSelects() {
  document.querySelectorAll("select").forEach((select) => {
    if (select.dataset.enhanced === "true") return;
    select.dataset.enhanced = "true";
    select.classList.add("native-select-hidden");

    const shell = document.createElement("div");
    shell.className = "select-shell";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "select-trigger";

    const menu = document.createElement("div");
    menu.className = "select-menu";
    menu.hidden = true;

    shell.append(trigger, menu);
    select.after(shell);

    shell.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleSelect(select);
    });
    menu.addEventListener("click", (event) => {
      const option = event.target.closest("[data-select-value]");
      if (!option) return;
      event.stopPropagation();
      select.value = option.dataset.selectValue;
      closeSelect(select);
      updateCustomSelect(select);
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    updateCustomSelect(select);
  });
}

function updateCustomSelect(select) {
  const shell = select.nextElementSibling;
  if (!shell?.classList.contains("select-shell")) return;
  const trigger = shell.querySelector(".select-trigger");
  const menu = shell.querySelector(".select-menu");
  const selected = select.options[select.selectedIndex];
  trigger.textContent = selected?.textContent || "";
  menu.innerHTML = "";

  [...select.options].forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `select-option${option.value === select.value ? " is-selected" : ""}`;
    button.dataset.selectValue = option.value;
    button.textContent = option.textContent;
    menu.appendChild(button);
  });
}

function refreshCustomSelects() {
  document.querySelectorAll("select[data-enhanced='true']").forEach(updateCustomSelect);
}

function toggleSelect(select) {
  const shell = select.nextElementSibling;
  const menu = shell.querySelector(".select-menu");
  const shouldOpen = menu.hidden;
  closeAllSelects();
  if (shouldOpen) {
    shell.classList.add("is-open");
    menu.hidden = false;
  }
}

function closeSelect(select) {
  const shell = select.nextElementSibling;
  if (!shell?.classList.contains("select-shell")) return;
  shell.classList.remove("is-open");
  shell.querySelector(".select-menu").hidden = true;
}

function closeAllSelects() {
  document.querySelectorAll(".select-shell").forEach((shell) => {
    shell.classList.remove("is-open");
    const menu = shell.querySelector(".select-menu");
    if (menu) menu.hidden = true;
  });
}

function normalizeAssetType(item) {
  const type = String(item.type || item.quoteType || "").toUpperCase();
  if (type.includes("CRYPTO")) return "crypto";
  if (type.includes("CURRENCY") || item.symbol?.endsWith("=X")) return "forex";
  if (type.includes("INDEX") || item.symbol?.startsWith("^")) return "index";
  if (type.includes("ETF")) return "etf";
  if (type.includes("EQUITY") || type.includes("STOCK")) return "stock";
  return "other";
}

function getFallbackMatches(query, filter) {
  const needle = query.trim().toLowerCase();
  const normalizedForex = query.replace(/[^a-z]/gi, "").toUpperCase();
  const directForex = /^[A-Z]{6}$/.test(normalizedForex)
    ? [{
        symbol: `${normalizedForex}=X`,
        name: `${normalizedForex.slice(0, 3)} / ${normalizedForex.slice(3)}`,
        type: "forex",
        source: "Yahoo",
        provider: "yahoo",
        priceId: `${normalizedForex}=X`,
      }]
    : [];
  const fallback = fallbackMarkets.filter((item) => {
    const matchesText = `${item.symbol} ${item.name}`.toLowerCase().includes(needle);
    const matchesType = filter === "all" || item.type === filter;
    return matchesText && matchesType;
  }).map((item) => ({ ...item, provider: item.source.toLowerCase(), priceId: item.symbol }));
  return uniqueMarkets([...directForex.filter((item) => filter === "all" || item.type === filter), ...fallback]);
}

async function searchYahoo(query, filter) {
  const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=16&newsCount=0`);
  if (!response.ok) throw new Error("Yahoo search failed");
  const data = await response.json();
  return (data.quotes || [])
    .map((item) => ({
      symbol: item.symbol,
      name: item.shortname || item.longname || item.exchange || item.symbol,
      type: normalizeAssetType(item),
      source: item.exchange || "Yahoo",
      provider: "yahoo",
      priceId: item.symbol,
    }))
    .filter((item) => item.symbol && (filter === "all" || item.type === filter));
}

async function getBinanceSymbols() {
  const response = await fetch("https://api.binance.com/api/v3/exchangeInfo");
  if (!response.ok) throw new Error("Binance symbols failed");
  const data = await response.json();
  return (data.symbols || [])
    .filter((item) => item.status === "TRADING")
    .map((item) => ({
      symbol: item.symbol,
      name: `${item.baseAsset} / ${item.quoteAsset}`,
      type: "crypto",
      source: "Binance",
      provider: "binance",
      priceId: item.symbol,
    }));
}

async function searchBinance(query, filter) {
  if (filter !== "all" && filter !== "crypto") return [];
  const needle = query.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const symbols = await getBinanceSymbols();
  return symbols
    .filter((item) => `${item.symbol} ${item.name}`.toLowerCase().includes(needle))
    .slice(0, 12);
}

async function searchCoinGecko(query, filter) {
  if (filter !== "all" && filter !== "crypto") return [];
  const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("CoinGecko search failed");
  const data = await response.json();
  return (data.coins || []).slice(0, 12).map((item) => ({
    symbol: item.symbol.toUpperCase(),
    name: item.name,
    type: "crypto",
    source: "CoinGecko",
    provider: "coingecko",
    priceId: item.id,
  }));
}

function uniqueMarkets(results) {
  const seen = new Set();
  return results.filter((item) => {
    const key = `${item.provider}:${item.priceId || item.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderSearchResults(results, message = "") {
  const target = $("searchResults");
  target.innerHTML = "";

  if (message) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = message;
    target.appendChild(empty);
    return;
  }

  results.slice(0, 14).forEach((item) => {
    const button = document.createElement("button");
    button.className = "search-result";
    button.type = "button";
    button.dataset.symbol = item.symbol;
    button.dataset.type = item.type;
    button.dataset.provider = item.provider || "";
    button.dataset.priceId = item.priceId || item.symbol;
    button.innerHTML = `
      <span>
        <strong>${escapeHtml(item.symbol)}</strong>
        <small>${escapeHtml(item.name || item.shortname || item.longname || item.exchange || "market")} / ${escapeHtml(item.source || "market")}</small>
      </span>
      <span class="asset-chip">${escapeHtml(item.type)}</span>
    `;
    target.appendChild(button);
  });
}

async function searchMarkets() {
  const query = $("marketSearch").value.trim();
  $("symbol").value = query.toUpperCase();
  state.settings.symbol = $("symbol").value;
  state.selectedMarket = null;
  saveState();
  const filter = $("marketFilter").value;
  const exchange = $("priceProvider").value;

  if (query.length < 2) {
    renderSearchResults([]);
    return;
  }

  const cacheKey = `${query.toLowerCase()}|${filter}|${exchange}`;
  const cached = marketSearchCache.get(cacheKey);
  if (cached) {
    renderSearchResults(cached, cached.length ? "" : "no matching market found");
    return;
  }

  const fallback = getFallbackMatches(query, filter);
  const requestId = ++searchRequestId;
  renderSearchResults(fallback, fallback.length ? "" : "searching markets...");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`/api/markets?query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}&exchange=${encodeURIComponent(exchange)}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error("Market endpoint failed");
    const data = await response.json();
    if (requestId !== searchRequestId) return;
    const results = uniqueMarkets([...(data.results || []), ...fallback]);
    marketSearchCache.set(cacheKey, results);
    renderSearchResults(results, results.length ? "" : "no matching market found");
    return;
  } catch {
    if (requestId !== searchRequestId) return;
    const fallback = getFallbackMatches(query, filter);
    renderSearchResults(fallback, fallback.length ? "" : "no matching market found");
  }
}

function selectMarket(symbol, type = "all", provider = "", priceId = symbol) {
  $("symbol").value = symbol;
  $("marketSearch").value = symbol;
  if (isAllowedExchange(provider)) $("priceProvider").value = provider;
  if (type !== "other" && [...$("marketFilter").options].some((option) => option.value === type)) {
    $("marketFilter").value = type;
  }
  state.selectedMarket = { symbol, type, provider, priceId };
  renderSearchResults([]);
  readSettingsFromDom();
  state.selectedMarket = { symbol, type, provider, priceId };
  saveState();
  render();
  startLivePrice();
}

function buildTrade(id = createId()) {
  readSettingsFromDom();
  const calc = getCalculator();
  return {
    id,
    date: $("tradeDate").value || new Date().toISOString().slice(0, 10),
    symbol: $("symbol").value.trim().toUpperCase() || "MANUAL",
    direction: $("direction").value,
    measurementMode: calc.measurementMode,
    entry: calc.entry,
    exitPrice: calc.exit,
    stopPrice: calc.stopPrice,
    takeProfit: calc.takeProfit1 || calc.takeProfit2 || 0,
    takeProfit1: calc.takeProfit1,
    takeProfit2: calc.takeProfit2,
    slPoints: calc.slPoints,
    tpPoints: calc.targetPoints,
    tp1Points: calc.tp1Points,
    tp2Points: calc.tp2Points,
    signalBy: $("signalBy").value.trim(),
    rawSl: calc.rawSl,
    rawTp: calc.rawTp1 || calc.rawTp2 || 0,
    rawTp1: calc.rawTp1,
    rawTp2: calc.rawTp2,
    pointValue: calc.pointValue,
    riskAmount: calc.riskAmount,
    lotSize: calc.lotSize,
    rr: calc.rr,
    estimatedGain: calc.gain,
    pnl: calc.exit > 0 ? calc.autoPnl : null,
    result: calc.exit > 0 ? (calc.autoPnl > 0 ? "win" : calc.autoPnl < 0 ? "loss" : "breakeven") : $("result").value,
    notes: $("notes").value.trim(),
    customFields: readCustomFieldValues(),
  };
}

function readCustomFieldValues() {
  return Object.fromEntries(
    state.customColumns.map((column) => [
      column.key,
      document.querySelector(`[data-custom-field="${column.key}"]`)?.value.trim() || state.settings.customFieldValues?.[column.key] || "",
    ]),
  );
}

function buildEmptyTrade() {
  const pointValue = Number(state.settings.pointValue) || 1;
  return {
    id: createId(),
    date: new Date().toISOString().slice(0, 10),
    symbol: "MANUAL",
    direction: "long",
    measurementMode: "points",
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
    signalBy: "",
    rawSl: 0,
    rawTp: 0,
    rawTp1: 0,
    rawTp2: 0,
    pointValue,
    riskAmount: 0,
    lotSize: 0,
    rr: 0,
    estimatedGain: 0,
    pnl: null,
    result: "open",
    notes: "",
    customFields: Object.fromEntries(state.customColumns.map((column) => [column.key, ""])),
  };
}

function addJournalRow() {
  state.trades.unshift(buildEmptyTrade());
  saveState();
  render();
  notify("row added");
  setTimeout(() => {
    document.querySelector("[data-cell-field='symbol']")?.focus();
  }, 0);
}

function updateTradeCell(cell) {
  const tradeId = cell.dataset.cellTrade;
  const field = cell.dataset.cellField;
  const trade = state.trades.find((item) => item.id === tradeId);
  if (!trade || !field) return;

  const value = cell.textContent.trim();
  applyCellValue(trade, field, value);
  recalculateInlineTrade(trade);
  saveState();
  updateAnalytics();
  cell.textContent = displayCellValue(trade, field);
  notify("cell saved");
}

function applyCellValue(trade, field, value) {
  if (field.startsWith("custom:")) {
    const key = field.slice("custom:".length);
    trade.customFields = { ...(trade.customFields || {}), [key]: value };
    return;
  }

  if (field === "date") {
    trade.date = normalizeDateInput(value) || trade.date;
  } else if (field === "symbol") {
    trade.symbol = value.toUpperCase() || "MANUAL";
  } else if (field === "entry") {
    trade.entry = parseEditableNumber(value);
  } else if (field === "exitPrice") {
    trade.exitPrice = parseEditableNumber(value);
  } else if (field === "slTp") {
    applySlTpCell(trade, value);
  } else if (field === "signalBy") {
    trade.signalBy = value;
  } else if (field === "pnl") {
    trade.pnl = parseEditableNumber(value);
    trade.manualPnl = true;
  } else if (field === "notes") {
    trade.notes = value;
  }
}

function applySlTpCell(trade, value) {
  const [sl = 0, tp1 = 0, tp2 = 0] = value
    .split("/")
    .map((item) => parseEditableNumber(item));
  trade.slPoints = sl;
  trade.tp1Points = tp1;
  trade.tp2Points = tp2;
  trade.tpPoints = tp1 || tp2 || 0;
  trade.rawSl = sl;
  trade.rawTp1 = tp1;
  trade.rawTp2 = tp2;
  trade.rawTp = trade.tpPoints;
  if (trade.measurementMode === "price") {
    trade.stopPrice = sl;
    trade.takeProfit1 = tp1;
    trade.takeProfit2 = tp2;
  }
}

function recalculateInlineTrade(trade) {
  const capital = Number(state.settings.capital) || 0;
  const riskPercent = Number(state.settings.riskPercent) || 0;
  const pointValue = Number(trade.pointValue) || Number(state.settings.pointValue) || 1;
  const riskAmount = Number(trade.riskAmount) || capital * (riskPercent / 100);
  const slPoints = Number(trade.slPoints) || 0;
  const targetPoints = Number(trade.tp1Points) || Number(trade.tp2Points) || Number(trade.tpPoints) || 0;

  trade.pointValue = pointValue;
  trade.riskAmount = riskAmount;
  if (slPoints > 0 && pointValue > 0) {
    trade.lotSize = riskAmount / (slPoints * pointValue);
  }
  if (slPoints > 0 && targetPoints > 0) {
    trade.rr = targetPoints / slPoints;
    trade.estimatedGain = riskAmount * trade.rr;
  }
  if (trade.manualPnl) return;
  if (!trade.manualPnl && Number(trade.exitPrice) > 0 && Number(trade.entry) > 0) {
    const pnl = (trade.direction === "short" ? trade.entry - trade.exitPrice : trade.exitPrice - trade.entry) * (Number(trade.lotSize) || 0) * pointValue;
    trade.pnl = pnl;
    trade.result = pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven";
  }
}

function displayCellValue(trade, field) {
  if (field.startsWith("custom:")) return trade.customFields?.[field.slice("custom:".length)] || "";
  if (field === "entry") return trade.entry ? formatNumber(trade.entry) : "";
  if (field === "exitPrice") return trade.exitPrice ? formatNumber(trade.exitPrice) : "";
  if (field === "slTp") return `${formatNumber(trade.slPoints)} / ${formatOptionalNumber(trade.tp1Points || trade.tpPoints)} / ${formatOptionalNumber(trade.tp2Points)}`;
  if (field === "pnl") return money.format(getTradePnl(trade));
  return trade[field] || "";
}

function parseEditableNumber(value) {
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDateInput(value) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!slash) return "";
  const [, first, second, year] = slash;
  const settings = loadAppSettings();
  const month = settings.dateFormat === "dd/mm/yyyy" ? second : first;
  const day = settings.dateFormat === "dd/mm/yyyy" ? first : second;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function saveTrade() {
  const trade = buildTrade(editingTradeId || undefined);
  if (!trade.entry || !trade.slPoints || !trade.pointValue) {
    setStatus("entry, SL, and point value are required");
    return;
  }

  if (editingTradeId) {
    state.trades = state.trades.map((item) => (item.id === editingTradeId ? trade : item));
    setStatus("trade updated");
  } else {
    state.trades.unshift(trade);
    setStatus("trade added");
  }

  clearTradeForm(false);
  saveState();
  render();
}

function clearTradeForm(keepPrice = true) {
  editingTradeId = null;
  state.settings.notes = "";
  state.settings.tradeDate = new Date().toISOString().slice(0, 10);
  state.settings.exitPrice = "";
  state.settings.customFieldValues = {};
  $("notes").value = "";
  $("tradeDate").value = state.settings.tradeDate;
  $("exitPrice").value = "";
  $("result").value = "open";
  if (!keepPrice) state.settings.result = "open";
  $("addTrade").textContent = "add trade to journal";
  $("cancelEdit").hidden = true;
}

function editTrade(id) {
  const trade = state.trades.find((item) => item.id === id);
  if (!trade) return;

  editingTradeId = id;
  $("tradeDate").value = trade.date || new Date().toISOString().slice(0, 10);
  $("symbol").value = trade.symbol;
  $("entryPrice").value = trade.entry;
  $("exitPrice").value = trade.exitPrice || "";
  $("measurementMode").value = trade.measurementMode || "points";
  $("slPoints").value = trade.measurementMode === "price" ? trade.stopPrice : trade.slPoints;
  $("tp1Points").value = trade.measurementMode === "price" ? (trade.takeProfit1 || trade.takeProfit || "") : (trade.tp1Points || trade.tpPoints || "");
  $("tp2Points").value = trade.measurementMode === "price" ? (trade.takeProfit2 || "") : (trade.tp2Points || "");
  $("signalBy").value = trade.signalBy || "";
  $("pointValue").value = trade.pointValue;
  $("direction").value = trade.direction;
  $("result").value = trade.result;
  $("notes").value = trade.notes || "";
  state.settings.customFieldValues = { ...(trade.customFields || {}) };
  $("addTrade").textContent = "update trade";
  $("cancelEdit").hidden = false;
  readSettingsFromDom();
  state.settings.customFieldValues = { ...(trade.customFields || {}) };
  render();
  document.querySelector("#calculator").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteTrade(id) {
  const trade = state.trades.find((item) => item.id === id);
  if (!trade) return;
  const confirmed = await confirmDialog({
    title: "Remove trade?",
    message: `Remove ${trade.symbol} trade? This cannot be undone.`,
    confirmText: "remove",
  });
  if (!confirmed) return;
  state.trades = state.trades.filter((item) => item.id !== id);
  if (editingTradeId === id) clearTradeForm();
  saveState();
  render();
}

function addCustomColumn() {
  const input = $("customColumnName");
  const label = normalizeColumnLabel(input?.value || "");
  if (!label) {
    notify("column name required");
    return;
  }

  const key = createColumnKey(label);
  if (state.customColumns.some((column) => column.key === key || column.label.toLowerCase() === label.toLowerCase())) {
    notify("column already exists");
    return;
  }

  state.customColumns.push({ id: createId(), key, label });
  state.settings.customFieldValues = { ...(state.settings.customFieldValues || {}), [key]: "" };
  input.value = "";
  saveState();
  render();
  notify(`${label} column added`);
}

async function removeCustomColumn(key) {
  const column = state.customColumns.find((item) => item.key === key);
  if (!column) return;
  const confirmed = await confirmDialog({
    title: "Remove column?",
    message: `Remove ${column.label} from the journal table? Saved trade values for this column will be hidden.`,
    confirmText: "remove",
  });
  if (!confirmed) return;

  state.customColumns = state.customColumns.filter((item) => item.key !== key);
  delete state.settings.customFieldValues?.[key];
  saveState();
  render();
}

function createColumnKey(label) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "column";
  let key = base;
  let index = 2;
  while (state.customColumns.some((column) => column.key === key)) {
    key = `${base}_${index}`;
    index += 1;
  }
  return key;
}

function normalizeColumnLabel(label) {
  const cleanLabel = String(label || "").trim().replace(/\s+/g, " ");
  if (/signal|strategy|setup|mentor|source/i.test(cleanLabel)) return "signal by";
  return cleanLabel;
}

function exportCsv() {
  const baseHeader = [
    "date",
    "symbol",
    "direction",
    "measurementMode",
    "entry",
    "exitPrice",
    "stopPrice",
    "takeProfit",
    "takeProfit1",
    "takeProfit2",
    "slPoints",
    "tp1Points",
    "tp2Points",
    "signalBy",
    "lotSize",
    "rr",
    "result",
    "pnl",
    "notes",
  ];
  const customHeader = state.customColumns.map((column) => `custom:${column.label}`);
  const header = [...baseHeader, ...customHeader];
  const lines = state.trades.map((trade) =>
    header
      .map((key) => {
        const customColumn = key.startsWith("custom:")
          ? state.customColumns.find((column) => `custom:${column.label}` === key)
          : null;
        const value = customColumn
          ? trade.customFields?.[customColumn.key] || ""
          : key === "pnl" ? getTradePnl(trade) : trade[key] ?? "";
        return `"${String(value).replaceAll('"', '""')}"`;
      })
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "trade-journal.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

async function importCsv(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const rows = parseCsv(text);
  const [header = [], ...records] = rows;
  const keys = header.map((item) => item.trim());
  const customImports = keys
    .filter((key) => key.toLowerCase().startsWith("custom:"))
    .map((key) => {
      const label = normalizeColumnLabel(key.slice("custom:".length));
      if (!label) return null;
      const existing = state.customColumns.find((column) => column.label.toLowerCase() === label.toLowerCase());
      if (existing) return { header: key, column: existing };
      const column = { id: createId(), key: createColumnKey(label), label };
      state.customColumns.push(column);
      return { header: key, column };
    })
    .filter(Boolean);
  const imported = records.map((record) => {
    const item = Object.fromEntries(keys.map((key, index) => [key, record[index] ?? ""]));
    const entry = Number(item.entry) || 0;
    const exitPrice = Number(item.exitPrice) || 0;
    const slPoints = Number(item.slPoints) || 0;
    const tp1Points = Number(item.tp1Points) || Number(item.tpPoints) || 0;
    const tp2Points = Number(item.tp2Points) || 0;
    const targetPoints = tp1Points || tp2Points || 0;
    const pointValue = Number(item.pointValue) || Number(state.settings.pointValue) || 1;
    const riskAmount = Number(item.riskAmount) || Number(state.settings.capital || 0) * (Number(state.settings.riskPercent || 0) / 100);
    const lotSize = Number(item.lotSize) || (slPoints > 0 && pointValue > 0 ? riskAmount / (slPoints * pointValue) : 0);
    const direction = item.direction || "long";
    const pnl = exitPrice > 0 ? (direction === "long" ? exitPrice - entry : entry - exitPrice) * lotSize * pointValue : Number(item.pnl) || null;
    return {
      id: createId(),
      date: item.date || new Date().toISOString().slice(0, 10),
      symbol: (item.symbol || "MANUAL").toUpperCase(),
      direction,
      measurementMode: item.measurementMode || "points",
      entry,
      exitPrice,
      stopPrice: Number(item.stopPrice) || 0,
      takeProfit: Number(item.takeProfit) || Number(item.takeProfit1) || Number(item.takeProfit2) || 0,
      takeProfit1: Number(item.takeProfit1) || Number(item.takeProfit) || 0,
      takeProfit2: Number(item.takeProfit2) || 0,
      slPoints,
      tpPoints: targetPoints,
      tp1Points,
      tp2Points,
      rawSl: Number(item.rawSl) || slPoints,
      rawTp: Number(item.rawTp) || targetPoints,
      rawTp1: Number(item.rawTp1) || tp1Points,
      rawTp2: Number(item.rawTp2) || tp2Points,
      signalBy: item.signalBy || "",
      pointValue,
      riskAmount,
      lotSize,
      rr: Number(item.rr) || (slPoints > 0 && targetPoints > 0 ? targetPoints / slPoints : 0),
      estimatedGain: Number(item.estimatedGain) || riskAmount * (slPoints > 0 && targetPoints > 0 ? targetPoints / slPoints : 0),
      pnl,
      result: item.result || (pnl > 0 ? "win" : pnl < 0 ? "loss" : "open"),
      notes: item.notes || "",
      customFields: Object.fromEntries(customImports.map(({ header, column }) => [column.key, item[header] || ""])),
    };
  }).filter((trade) => trade.symbol && trade.entry);

  state.trades = [...imported, ...state.trades];
  saveState();
  render();
  notify(`${imported.length} trades imported`);
  event.target.value = "";
}

async function resetData() {
  const confirmed = await confirmDialog({
    title: "Reset all data?",
    message: "Reset settings, journal data, and custom columns? This cannot be undone.",
    confirmText: "reset",
  });
  if (!confirmed) return;
  stopLivePrice();
  state = structuredClone(defaults);
  editingTradeId = null;
  saveState();
  writeSettingsToDom();
  applyTheme();
  render();
  startLivePrice();
}

function confirmDialog({ title, message, confirmText = "confirm" }) {
  $("confirmTitle").textContent = title;
  $("confirmMessage").textContent = message;
  $("confirmOk").textContent = confirmText;
  $("confirmOverlay").hidden = false;
  $("confirmCancel").focus();

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function closeConfirmDialog(result) {
  $("confirmOverlay").hidden = true;
  if (confirmResolver) {
    confirmResolver(result);
    confirmResolver = null;
  }
}

function setStatus(message) {
  $("priceStatus").textContent = message;
}

function setPriceSource(message) {
  $("priceSource").textContent = message;
}

function setLivePrice(price, source) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return;

  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: value > 10 ? 2 : 5,
    maximumFractionDigits: value > 10 ? 2 : 8,
  });
  $("livePrice").value = formatted.replaceAll(",", "");
  $("livePrice").classList.remove("needs-manual-price");
  if (!editingTradeId) {
    $("entryPrice").value = value.toFixed(value > 10 ? 2 : 5);
    readSettingsFromDom();
    updateCalculator();
  }
  setStatus(`${source} live`);
  setPriceSource(`Price source: ${source}. Quotes may vary by venue and public API availability.`);
}

function stopLivePrice() {
  if (priceTimer) {
    clearInterval(priceTimer);
    priceTimer = null;
  }
}

function startLivePrice() {
  stopLivePrice();
  const symbol = $("symbol").value.trim().toUpperCase();
  const selected = state.selectedMarket?.symbol === symbol ? state.selectedMarket : null;
  const preferredProvider = $("priceProvider").value;
  if (!symbol) {
    $("livePrice").value = "";
    setStatus("enter a symbol");
    setPriceSource("Search and select a market to load prices from Binance, Bitget, OKX, LBank, MEXC, Yahoo Finance, or CoinGecko.");
    return;
  }

  $("livePrice").value = "";
  $("livePrice").classList.remove("needs-manual-price");
  setStatus("connecting live price...");
  setPriceSource("Connecting to a public quote source...");
  const exchangeProvider = preferredProvider !== "auto" ? preferredProvider : selected?.provider;
  if (isAllowedExchange(exchangeProvider)) {
    startExchangePrice(exchangeProvider, selected?.priceId || symbol);
  } else if (selected?.provider === "coingecko" && selected.priceId) {
    startCoinGeckoById(selected.priceId);
  } else {
    startYahooPrice(selected?.priceId || symbol);
  }
}

function startExchangePrice(provider, symbol) {
  stopLivePrice();

  const load = async () => {
    try {
      const market = $("priceMarket")?.value || "spot";
      const response = await fetch(`/api/price?provider=${encodeURIComponent(provider)}&symbol=${encodeURIComponent(symbol)}&market=${encodeURIComponent(market)}`);
      if (!response.ok) throw new Error("Exchange quote failed");
      const data = await response.json();
      if (data.unavailable || !data.price) throw new Error("Exchange quote unavailable");
      setLivePrice(data.price, data.source || provider);
    } catch {
      setManualPriceNeeded(`${provider} unavailable; enter manually`);
      setPriceSource(`The selected ${provider} quote source did not respond. Manual price entry is available.`);
    }
  };

  load();
  priceTimer = setInterval(load, 10000);
}

function startYahooPrice(symbol) {
  stopLivePrice();

  const load = async () => {
    try {
      const response = await fetch(`/api/price?provider=yahoo&symbol=${encodeURIComponent(symbol)}`);
      if (!response.ok) throw new Error("Yahoo quote failed");
      const data = await response.json();
      if (data.unavailable) throw new Error("Yahoo quote unavailable");
      const price = data.price;
      if (!price) throw new Error("No price");
      setLivePrice(price, "yahoo");
    } catch {
      startCoinGeckoFallback(symbol);
    }
  };

  load();
  priceTimer = setInterval(load, 15000);
}

function startCoinGeckoFallback(symbol) {
  stopLivePrice();
  const id = coinGeckoIds[symbol];
  if (!id) {
    setManualPriceNeeded("manual price for this symbol");
    setPriceSource("No public live source matched this symbol yet. You can still enter the price manually.");
    return;
  }

  const load = async () => {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
      if (!response.ok) throw new Error("CoinGecko failed");
      const data = await response.json();
      setLivePrice(data[id].usd, "coingecko");
    } catch {
      setManualPriceNeeded("live price unavailable; enter manually");
      setPriceSource("The public quote source did not respond. Manual price entry is available.");
    }
  };

  load();
  priceTimer = setInterval(load, 10000);
}

function startCoinGeckoById(id) {
  stopLivePrice();

  const load = async () => {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`);
      if (!response.ok) throw new Error("CoinGecko failed");
      const data = await response.json();
      setLivePrice(data[id].usd, "coingecko");
    } catch {
      setManualPriceNeeded("live price unavailable; enter manually");
      setPriceSource("CoinGecko did not return this token price. Manual price entry is available.");
    }
  };

  load();
  priceTimer = setInterval(load, 10000);
}

function applyTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = state.theme === "dark" || (state.theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
  const icon = dark ? "☀" : "☾";
  if ($("themeIcon")) $("themeIcon").textContent = icon;
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  state.theme = isDark ? "light" : "dark";
  saveState();
  applyTheme();
}

function bindEvents() {
  fields.forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      readSettingsFromDom();
      render();
      if (id === "symbol" || id === "priceProvider" || id === "priceMarket") {
        clearTimeout(symbolDebounce);
        symbolDebounce = setTimeout(startLivePrice, 500);
      }
    });
    el.addEventListener("change", () => {
      readSettingsFromDom();
      render();
      if (id === "symbol" || id === "priceProvider" || id === "priceMarket") {
        startLivePrice();
        searchMarkets();
      }
    });
  });

  document.querySelectorAll("[data-mirror-source]").forEach((mirror) => {
    mirror.addEventListener("input", () => {
      const source = mirror.dataset.mirrorSource;
      const target = $(source);
      if (target) target.value = mirror.value;
      state.settings[source] = mirror.value;
      saveState();
      render();
    });
  });

  bindClick("addTrade", saveTrade);
  bindClick("addJournalRow", addJournalRow);
  bindClick("addCustomColumn", addCustomColumn);
  bindClick("cancelEdit", () => {
    clearTradeForm();
    render();
  });
  bindClick("exportCsv", exportCsv);
  $("importCsv")?.addEventListener("change", importCsv);
  bindClick("resetData", resetData);
  bindClick("confirmCancel", () => closeConfirmDialog(false));
  bindClick("confirmOk", () => closeConfirmDialog(true));
  $("confirmOverlay").addEventListener("click", (event) => {
    if (event.target === $("confirmOverlay")) closeConfirmDialog(false);
  });
  $("marketSearch").addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(searchMarkets, 350);
  });
  $("marketFilter").addEventListener("change", searchMarkets);
  $("livePrice")?.addEventListener("input", () => {
    const value = Number($("livePrice").value);
    if (Number.isFinite(value) && value > 0) {
      $("entryPrice").value = String(value);
      $("livePrice").classList.remove("needs-manual-price");
      readSettingsFromDom();
      updateCalculator();
      setStatus("manual price");
    }
  });
  $("searchResults").addEventListener("click", (event) => {
    const button = event.target.closest("[data-symbol]");
    if (button) selectMarket(button.dataset.symbol, button.dataset.type, button.dataset.provider, button.dataset.priceId);
  });
  $("tradeRows").addEventListener("change", (event) => {
    const select = event.target.closest("[data-side-trade]");
    if (!select) return;
    const trade = state.trades.find((item) => item.id === select.dataset.sideTrade);
    if (!trade) return;
    trade.direction = select.value === "short" ? "short" : "long";
    recalculateInlineTrade(trade);
    saveState();
    render();
    notify("side updated");
  });
  $("tradeRows").addEventListener("focusin", (event) => {
    const cell = event.target.closest("[data-cell-field]");
    if (!cell) return;
    cell.dataset.originalValue = cell.textContent;
  });
  $("tradeRows").addEventListener("focusout", (event) => {
    const cell = event.target.closest("[data-cell-field]");
    if (!cell || cell.textContent === cell.dataset.originalValue) return;
    updateTradeCell(cell);
  });
  $("tradeRows").addEventListener("keydown", (event) => {
    const cell = event.target.closest("[data-cell-field]");
    if (!cell) return;
    if (event.key === "Enter") {
      event.preventDefault();
      cell.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cell.textContent = cell.dataset.originalValue || "";
      cell.blur();
    }
  });
  $("customColumnName")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomColumn();
    }
  });
  $("customColumnList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-column-delete]");
    if (button) removeCustomColumn(button.dataset.columnDelete);
  });
  $("customFieldGrid")?.addEventListener("input", (event) => {
    const input = event.target.closest("[data-custom-field]");
    if (!input) return;
    state.settings.customFieldValues = {
      ...(state.settings.customFieldValues || {}),
      [input.dataset.customField]: input.value,
    };
    saveState();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  window.addEventListener("journal-theme-change", (event) => {
    state.theme = event.detail || state.theme;
    saveState();
    applyTheme();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".select-shell")) closeAllSelects();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllSelects();
      if (!$("confirmOverlay").hidden) closeConfirmDialog(false);
    }
  });
  window.addEventListener("beforeunload", stopLivePrice);
}

export function initTradeJournal() {
  applyAppSettings(loadAppSettings());
  writeSettingsToDom();
  enhanceSelects();
  applyTheme();
  bindEvents();
  render();
  startLivePrice();
  const editId = new URLSearchParams(window.location.search).get("edit");
  if (editId) {
    setTimeout(() => editTrade(editId), 50);
  }

  return () => {
    stopLivePrice();
    closeAllSelects();
  };
}
