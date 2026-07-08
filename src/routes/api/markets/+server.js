import { json } from '@sveltejs/kit';
import { exchangeProviders, isAllowedExchange } from '$lib/exchangeConfig.js';

const fallbackMarkets = [
  { symbol: 'BTCUSDT', name: 'Bitcoin / Tether', type: 'crypto', source: 'Binance', provider: 'binance', priceId: 'BTCUSDT' },
  { symbol: 'ETHUSDT', name: 'Ethereum / Tether', type: 'crypto', source: 'Binance', provider: 'binance', priceId: 'ETHUSDT' },
  { symbol: 'SOLUSDT', name: 'Solana / Tether', type: 'crypto', source: 'Binance', provider: 'binance', priceId: 'SOLUSDT' },
  { symbol: 'BTC-USDT', name: 'Bitcoin / Tether', type: 'crypto', source: 'OKX', provider: 'okx', priceId: 'BTC-USDT' },
  { symbol: 'btc_usdt', name: 'Bitcoin / Tether', type: 'crypto', source: 'LBank', provider: 'lbank', priceId: 'btc_usdt' },
  { symbol: 'EURUSD=X', name: 'Euro / US Dollar', type: 'forex', source: 'Yahoo', provider: 'yahoo', priceId: 'EURUSD=X' },
  { symbol: 'GBPUSD=X', name: 'British Pound / US Dollar', type: 'forex', source: 'Yahoo', provider: 'yahoo', priceId: 'GBPUSD=X' },
  { symbol: 'USDJPY=X', name: 'US Dollar / Japanese Yen', type: 'forex', source: 'Yahoo', provider: 'yahoo', priceId: 'USDJPY=X' },
  { symbol: 'AUDUSD=X', name: 'Australian Dollar / US Dollar', type: 'forex', source: 'Yahoo', provider: 'yahoo', priceId: 'AUDUSD=X' },
  { symbol: 'USDCAD=X', name: 'US Dollar / Canadian Dollar', type: 'forex', source: 'Yahoo', provider: 'yahoo', priceId: 'USDCAD=X' },
  { symbol: 'USDCHF=X', name: 'US Dollar / Swiss Franc', type: 'forex', source: 'Yahoo', provider: 'yahoo', priceId: 'USDCHF=X' },
  { symbol: 'NZDUSD=X', name: 'New Zealand Dollar / US Dollar', type: 'forex', source: 'Yahoo', provider: 'yahoo', priceId: 'NZDUSD=X' },
  { symbol: 'EURJPY=X', name: 'Euro / Japanese Yen', type: 'forex', source: 'Yahoo', provider: 'yahoo', priceId: 'EURJPY=X' },
  { symbol: 'EURGBP=X', name: 'Euro / British Pound', type: 'forex', source: 'Yahoo', provider: 'yahoo', priceId: 'EURGBP=X' },
  { symbol: '^GSPC', name: 'S&P 500 Index', type: 'index', source: 'Yahoo', provider: 'yahoo', priceId: '^GSPC' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', source: 'Yahoo', provider: 'yahoo', priceId: 'AAPL' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'etf', source: 'Yahoo', provider: 'yahoo', priceId: 'SPY' }
];

export async function GET({ url, fetch }) {
  const query = sanitizeQuery(url.searchParams.get('query') || '');
  const filter = sanitizeFilter(url.searchParams.get('filter') || 'all');
  const exchange = sanitizeExchange(url.searchParams.get('exchange') || 'auto');

  if (query.length < 2) return json({ results: [] });

  const quickResults = getQuickMatches(query, filter, exchange);
  const tasks = exchange === 'auto'
    ? [
        searchTradingView(fetch, query, filter),
        searchYahoo(fetch, query, filter),
        ...exchangeProviders.map((provider) => searchExchange(fetch, provider, query, filter))
      ]
    : [searchExchange(fetch, exchange, query, 'crypto')];

  const settled = await Promise.allSettled(tasks);
  const remoteResults = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const fallback = getFallbackMatches(query, filter, exchange);

  return json({ results: uniqueMarkets([...quickResults, ...remoteResults, ...fallback]).slice(0, 40) });
}

async function searchExchange(fetch, provider, query, filter) {
  if (!isAllowedExchange(provider) || (filter !== 'all' && filter !== 'crypto')) return [];
  if (provider === 'binance') return searchBinance(fetch, query);
  if (provider === 'bitget') return searchBitget(fetch, query);
  if (provider === 'okx') return searchOkx(fetch, query);
  if (provider === 'lbank') return searchLbank(fetch, query);
  if (provider === 'mexc') return searchMexc(fetch, query);
  return [];
}

async function searchTradingView(fetch, query, filter) {
  const response = await safeFetch(fetch, `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(query)}&hl=1&exchange=&lang=en&type=&domain=production`);
  const data = await response.json();

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const type = normalizeType(item.type);
      return {
        symbol: normalizeTradingViewSymbol(item),
        name: stripHtml(item.description || item.symbol || item.name || 'Market'),
        type,
        source: item.exchange ? `TradingView / ${item.exchange}` : 'TradingView',
        provider: type === 'crypto' && item.symbol?.toUpperCase().endsWith('USDT') ? 'binance' : 'yahoo',
        priceId: normalizeTradingViewPriceId(item, type)
      };
    })
    .filter((item) => item.symbol && matchesFilter(item, filter));
}

async function searchYahoo(fetch, query, filter) {
  const response = await safeFetch(fetch, `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=16&newsCount=0`);
  const data = await response.json();

  return (data.quotes || [])
    .map((item) => ({
      symbol: item.symbol,
      name: item.shortname || item.longname || item.exchange || item.symbol,
      type: normalizeType(item.quoteType || item.type),
      source: item.exchange || 'Yahoo',
      provider: 'yahoo',
      priceId: item.symbol
    }))
    .filter((item) => item.symbol && matchesFilter(item, filter));
}

async function searchBinance(fetch, query) {
  const data = await safeFetchJson(fetch, 'https://api.binance.com/api/v3/exchangeInfo');
  return (data.symbols || [])
    .filter((item) => item.status === 'TRADING')
    .map((item) => cryptoMarket(item.symbol, `${item.baseAsset} / ${item.quoteAsset}`, 'Binance', 'binance', item.symbol))
    .filter((item) => cryptoMatches(item, query))
    .slice(0, 16);
}

async function searchBitget(fetch, query) {
  const data = await safeFetchJson(fetch, 'https://api.bitget.com/api/v2/spot/public/symbols');
  return (data.data || [])
    .filter((item) => item.status === 'online')
    .map((item) => cryptoMarket(item.symbol, `${item.baseCoin} / ${item.quoteCoin}`, 'Bitget', 'bitget', item.symbol))
    .filter((item) => cryptoMatches(item, query))
    .slice(0, 16);
}

async function searchOkx(fetch, query) {
  const data = await safeFetchJson(fetch, 'https://www.okx.com/api/v5/public/instruments?instType=SPOT');
  return (data.data || [])
    .filter((item) => item.state === 'live')
    .map((item) => cryptoMarket(item.instId, `${item.baseCcy} / ${item.quoteCcy}`, 'OKX', 'okx', item.instId))
    .filter((item) => cryptoMatches(item, query))
    .slice(0, 16);
}

async function searchLbank(fetch, query) {
  const data = await safeFetchJson(fetch, 'https://api.lbkex.com/v2/currencyPairs.do');
  return (data.data || [])
    .map((symbol) => {
      const [base, quote] = String(symbol).split('_');
      return cryptoMarket(symbol, `${base?.toUpperCase()} / ${quote?.toUpperCase()}`, 'LBank', 'lbank', symbol);
    })
    .filter((item) => cryptoMatches(item, query))
    .slice(0, 16);
}

async function searchMexc(fetch, query) {
  const data = await safeFetchJson(fetch, 'https://api.mexc.com/api/v3/exchangeInfo');
  return (data.symbols || [])
    .filter((item) => item.status === '1' || item.status === 'TRADING')
    .map((item) => cryptoMarket(item.symbol, `${item.baseAsset} / ${item.quoteAsset}`, 'MEXC', 'mexc', item.symbol))
    .filter((item) => cryptoMatches(item, query))
    .slice(0, 16);
}

function cryptoMarket(symbol, name, source, provider, priceId) {
  return { symbol, name, type: 'crypto', source, provider, priceId };
}

function getFallbackMatches(query, filter, exchange) {
  const needle = query.toLowerCase();
  return fallbackMarkets.filter((item) => {
    const sourceMatches = exchange === 'auto' || item.provider === exchange;
    return sourceMatches && matchesFilter(item, filter) && `${item.symbol} ${item.name}`.toLowerCase().includes(needle);
  });
}

function getQuickMatches(query, filter, exchange) {
  if (exchange !== 'auto') return [];
  const normalized = query.replace(/[^a-z]/gi, '').toUpperCase();
  const forexSymbols = [];

  if (/^[A-Z]{6}$/.test(normalized)) {
    forexSymbols.push({
      symbol: `${normalized}=X`,
      name: `${normalized.slice(0, 3)} / ${normalized.slice(3)}`,
      type: 'forex',
      source: 'Yahoo',
      provider: 'yahoo',
      priceId: `${normalized}=X`
    });
  }

  return forexSymbols.filter((item) => matchesFilter(item, filter));
}

function cryptoMatches(item, query) {
  const needle = query.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const normalized = `${item.symbol} ${item.name}`.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return normalized.includes(needle);
}

function matchesFilter(item, filter) {
  return filter === 'all' || item.type === filter;
}

function normalizeType(value = '') {
  const type = String(value).toLowerCase();
  if (type.includes('crypto')) return 'crypto';
  if (type.includes('forex') || type.includes('currency') || type.includes('fx')) return 'forex';
  if (type.includes('index')) return 'index';
  if (type.includes('fund') || type.includes('etf')) return 'etf';
  if (type.includes('stock') || type.includes('equity')) return 'stock';
  if (type.includes('futures') || type.includes('commodity')) return 'futures';
  return 'other';
}

function normalizeTradingViewSymbol(item) {
  const raw = stripHtml(item.symbol || item.name || '');
  if (item.exchange && raw && !raw.includes(':')) return `${item.exchange}:${raw}`;
  return raw;
}

function normalizeTradingViewPriceId(item, type) {
  const raw = stripHtml(item.symbol || item.name || '');
  if (type === 'forex') {
    const compact = raw.replace(/[^a-z]/gi, '').toUpperCase();
    if (/^[A-Z]{6}$/.test(compact)) return `${compact}=X`;
  }
  if (type === 'crypto' && raw.toUpperCase().endsWith('USDT')) return raw.toUpperCase();
  return raw;
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, '');
}

function sanitizeQuery(value) {
  return String(value).trim().slice(0, 48);
}

function sanitizeFilter(value) {
  const allowed = ['all', 'crypto', 'forex', 'index', 'stock', 'etf', 'futures', 'other'];
  return allowed.includes(value) ? value : 'all';
}

function sanitizeExchange(value) {
  return value === 'auto' || isAllowedExchange(value) ? value : 'auto';
}

async function safeFetchJson(fetch, endpoint) {
  const response = await safeFetch(fetch, endpoint);
  return response.json();
}

async function safeFetch(fetch, endpoint) {
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(6000),
    headers: { accept: 'application/json' }
  });
  if (!response.ok) throw new Error('Market source failed');
  return response;
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
