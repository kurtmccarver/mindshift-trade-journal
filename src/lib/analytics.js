import { env } from '$env/dynamic/public';
import { loadAppSettings } from './appSettings.js';
import { loadBackups } from './backupActions.js';
import { loadJournalData, summarizeJournal } from './journalData.js';

const ANALYTICS_SESSION_KEY = 'mindshift-analytics-session:v1';
const SUMMARY_DEBOUNCE_MS = 1200;

let posthogClient = null;
let initialized = false;
let summaryTimer = null;
let lastSummaryPayload = '';

export async function initAnalytics() {
  const posthogKey = env.PUBLIC_POSTHOG_KEY;
  if (initialized || typeof window === 'undefined' || !posthogKey) return;
  initialized = true;

  try {
    const module = await import('posthog-js');
    posthogClient = module.default;
    posthogClient.init(posthogKey, {
      api_host: env.PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      respect_dnt: true,
      persistence: 'localStorage+cookie'
    });

    captureAppOpened();
    captureJournalSummary('app_opened');
  } catch {
    initialized = false;
    posthogClient = null;
  }
}

export function captureJournalSummary(reason = 'journal_updated') {
  if (!posthogClient) return;

  window.clearTimeout(summaryTimer);
  summaryTimer = window.setTimeout(() => {
    const payload = buildAggregatePayload(reason);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSummaryPayload) return;
    lastSummaryPayload = serialized;
    posthogClient.capture('journal_summary', payload);
  }, SUMMARY_DEBOUNCE_MS);
}

export function captureModeChanged() {
  if (!posthogClient) return;
  posthogClient.capture('mode_changed', buildAggregatePayload('mode_changed'));
}

function captureAppOpened() {
  if (sessionStorage.getItem(ANALYTICS_SESSION_KEY)) return;
  sessionStorage.setItem(ANALYTICS_SESSION_KEY, new Date().toISOString());
  posthogClient.capture('app_opened', buildAggregatePayload('app_opened'));
}

function buildAggregatePayload(reason) {
  const journal = loadJournalData();
  const settings = loadAppSettings();
  const summary = summarizeJournal(journal);
  const trades = journal.trades || [];
  const closedTrades = trades.filter((trade) => trade.result !== 'open');

  return {
    reason,
    trade_count: summary.totalTrades,
    open_trade_count: summary.openTrades,
    closed_trade_count: closedTrades.length,
    win_count: summary.wins,
    loss_count: summary.losses,
    custom_column_count: journal.customColumns?.length || 0,
    backup_count: loadBackups().length,
    has_trades: summary.totalTrades > 0,
    simple_mode_enabled: Boolean(settings.simpleMode),
    prop_firm_beta_enabled: Boolean(settings.propFirmEnabled),
    custom_theme_enabled: Boolean(settings.customThemeEnabled),
    currency: settings.currency || 'USD',
    date_format: settings.dateFormat || 'yyyy-mm-dd'
  };
}
