export const exchangeProviders = ['binance', 'bitget', 'okx', 'lbank', 'mexc'];

export const exchangeOptions = [
  { value: 'auto', label: 'Auto source' },
  { value: 'binance', label: 'Binance' },
  { value: 'bitget', label: 'Bitget' },
  { value: 'okx', label: 'OKX' },
  { value: 'lbank', label: 'LBank' },
  { value: 'mexc', label: 'MEXC' }
];

export function isAllowedExchange(value) {
  return exchangeProviders.includes(value);
}

export function normalizeExchange(value) {
  return isAllowedExchange(value) ? value : 'binance';
}

export function exchangeLabel(value) {
  return exchangeOptions.find((item) => item.value === value)?.label || 'Exchange';
}
