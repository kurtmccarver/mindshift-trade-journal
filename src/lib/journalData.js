export const STORAGE_KEY = 'minimal-trade-journal:v2';
export const LEGACY_KEY = 'minimal-trade-journal:v1';

import { formatDate as formatAppDate, formatMoney } from './appSettings.js';

export function loadJournalData() {
  if (typeof localStorage === 'undefined') return getEmptyJournal();

  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  if (!saved) return getEmptyJournal();

  try {
    const parsed = JSON.parse(saved);
    return {
      settings: parsed.settings || {},
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
      customColumns: Array.isArray(parsed.customColumns) ? parsed.customColumns : [],
      selectedMarket: parsed.selectedMarket || null,
      theme: parsed.theme || 'system'
    };
  } catch {
    return getEmptyJournal();
  }
}

export function getEmptyJournal() {
  return {
    settings: {},
    trades: [],
    customColumns: [],
    selectedMarket: null,
    theme: 'system'
  };
}

export function getTradePnl(trade) {
  if (trade.pnl !== null && trade.pnl !== undefined && trade.pnl !== '') return Number(trade.pnl) || 0;
  if (Number(trade.exitPrice) > 0) return Number(trade.pnl) || 0;
  if (trade.result === 'win') return Number(trade.estimatedGain) || 0;
  if (trade.result === 'loss') return -(Number(trade.riskAmount) || 0);
  return 0;
}

export function summarizeJournal(data) {
  const trades = data.trades || [];
  const settings = data.settings || {};
  const totalPnl = trades.reduce((sum, trade) => sum + getTradePnl(trade), 0);
  const totalRr = trades.reduce((sum, trade) => sum + (Number(trade.rr) || 0), 0);
  const closedTrades = trades.filter((trade) => trade.result !== 'open');
  const wins = trades.filter((trade) => trade.result === 'win').length;
  const losses = trades.filter((trade) => trade.result === 'loss').length;
  const winRate = closedTrades.length ? (wins / closedTrades.length) * 100 : 0;
  const activePhase = settings.activePhase || 'phase1';
  const capital = Number(settings.capital) || 0;
  const targetPercent = Number(settings[`${activePhase}Target`]) || 0;
  const targetAmount = capital * (targetPercent / 100);
  const progress = targetAmount > 0 ? Math.max(0, Math.min(100, (totalPnl / targetAmount) * 100)) : 0;

  return {
    totalPnl,
    totalRr,
    averageRr: trades.length ? totalRr / trades.length : 0,
    winRate,
    wins,
    losses,
    openTrades: trades.filter((trade) => trade.result === 'open').length,
    totalTrades: trades.length,
    activePhase,
    capital,
    targetPercent,
    targetAmount,
    progress
  };
}

export function money(value) {
  return formatMoney(value);
}

export function number(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 5 });
}

export function date(value) {
  return formatAppDate(value);
}
