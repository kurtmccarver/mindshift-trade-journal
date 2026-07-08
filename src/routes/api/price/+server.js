import { json } from '@sveltejs/kit';
import { exchangeLabel, isAllowedExchange } from '$lib/exchangeConfig.js';
import { checkRateLimit } from '$lib/rateLimit.server.js';

export async function GET({ url, fetch, getClientAddress }) {
  const limit = checkRateLimit(`price:${getClientAddress()}`, { windowMs: 60_000, max: 120 });
  if (!limit.allowed) {
    return json({ error: 'Too many price requests. Please slow down for a moment.' }, { status: 429 });
  }

  const provider = url.searchParams.get('provider') || '';
  const symbol = sanitizeSymbol(url.searchParams.get('symbol') || '');
  const market = sanitizeMarket(url.searchParams.get('market') || 'spot');

  if ((!isAllowedExchange(provider) && provider !== 'yahoo') || !symbol) {
    return json({ error: 'Invalid price source or symbol' }, { status: 400 });
  }

  try {
    if (provider === 'yahoo') {
      const price = await getYahooPrice(fetch, symbol);
      return json({ price, source: 'Yahoo', symbol, market: 'spot' });
    }
    const price = await getExchangePrice(fetch, provider, symbol, market);
    return json({ price, source: `${exchangeLabel(provider)} ${market === 'perp' ? 'perpetual' : 'spot'}`, symbol, market });
  } catch {
    return json({ price: null, unavailable: true, error: 'Price unavailable from selected source', symbol, market });
  }
}

async function getYahooPrice(fetch, symbol) {
  const data = await safeFetchJson(fetch, `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(symbol))}?range=1d&interval=1m`);
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  const close = result?.indicators?.quote?.[0]?.close || [];
  const lastClose = [...close].reverse().find((value) => Number.isFinite(value));
  return requirePrice(meta?.regularMarketPrice || lastClose);
}

async function getExchangePrice(fetch, provider, symbol, market) {
  if (provider === 'binance') {
    const endpoint = market === 'perp'
      ? `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${encodeURIComponent(toCompactSymbol(symbol))}`
      : `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(toCompactSymbol(symbol))}`;
    const data = await safeFetchJson(fetch, endpoint);
    return requirePrice(data.price);
  }

  if (provider === 'bitget') {
    const endpoint = market === 'perp'
      ? `https://api.bitget.com/api/v2/mix/market/ticker?symbol=${encodeURIComponent(toCompactSymbol(symbol))}&productType=USDT-FUTURES`
      : `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${encodeURIComponent(toCompactSymbol(symbol))}`;
    const data = await safeFetchJson(fetch, endpoint);
    return requirePrice(data.data?.[0]?.lastPr);
  }

  if (provider === 'okx') {
    const endpoint = market === 'perp'
      ? `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(toDashedSymbol(symbol, 'SWAP'))}`
      : `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(toDashedSymbol(symbol))}`;
    const data = await safeFetchJson(fetch, endpoint);
    return requirePrice(data.data?.[0]?.last);
  }

  if (provider === 'lbank') {
    const data = await safeFetchJson(fetch, `https://api.lbkex.com/v2/ticker/24hr.do?symbol=${encodeURIComponent(toUnderscoreSymbol(symbol))}`);
    return requirePrice(data.data?.[0]?.ticker?.latest);
  }

  if (provider === 'mexc') {
    const endpoint = market === 'perp'
      ? `https://contract.mexc.com/api/v1/contract/ticker?symbol=${encodeURIComponent(toUnderscoreSymbol(symbol).toUpperCase())}`
      : `https://api.mexc.com/api/v3/ticker/price?symbol=${encodeURIComponent(toCompactSymbol(symbol))}`;
    const data = await safeFetchJson(fetch, endpoint);
    if (market === 'perp') return requirePrice(data.data?.lastPrice || data.data?.fairPrice);
    return requirePrice(data.price);
  }

  throw new Error('Unsupported provider');
}

function requirePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price');
  return price;
}

function sanitizeSymbol(value) {
  return String(value).trim().slice(0, 32).replace(/[^a-zA-Z0-9_^=._:-]/g, '');
}

function sanitizeMarket(value) {
  return value === 'perp' ? 'perp' : 'spot';
}

function splitSymbol(symbol) {
  const cleaned = symbol.replace(/^[A-Z]+:/i, '').replace(/=X$/i, '').toUpperCase();
  if (cleaned.includes('-')) return cleaned.split('-');
  if (cleaned.includes('_')) return cleaned.split('_');
  if (cleaned.endsWith('USDT')) return [cleaned.slice(0, -4), 'USDT'];
  if (cleaned.endsWith('USDC')) return [cleaned.slice(0, -4), 'USDC'];
  if (cleaned.endsWith('USD')) return [cleaned.slice(0, -3), 'USD'];
  return [cleaned, 'USDT'];
}

function toYahooSymbol(symbol) {
  const raw = String(symbol).replace(/^[A-Z]+:/i, '').toUpperCase();
  if (raw.includes('=X') || raw.startsWith('^')) return raw;
  const compact = raw.replace(/[^A-Z]/g, '');
  if (/^[A-Z]{6}$/.test(compact)) return `${compact}=X`;
  return raw;
}

function toCompactSymbol(symbol) {
  return splitSymbol(symbol).join('');
}

function toDashedSymbol(symbol, suffix = '') {
  const dashed = splitSymbol(symbol).join('-');
  return suffix ? `${dashed}-${suffix}` : dashed;
}

function toUnderscoreSymbol(symbol) {
  return splitSymbol(symbol).join('_').toLowerCase();
}

async function safeFetchJson(fetch, endpoint) {
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(6000),
    headers: { accept: 'application/json' }
  });
  if (!response.ok) throw new Error('Exchange request failed');
  return response.json();
}
