export const SETTINGS_KEY = 'mindshift-user-settings:v1';

export const defaultSettings = {
  font: 'geist',
  dateFormat: 'yyyy-mm-dd',
  currency: 'USD',
  customBackground: '#ffffff',
  customInk: '#0a0a0a',
  customThemeEnabled: false,
  propFirmEnabled: false,
  simpleMode: true
};

export function loadAppSettings() {
  if (typeof localStorage === 'undefined') return { ...defaultSettings };

  try {
    return normalizeAppSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
  } catch {
    return { ...defaultSettings };
  }
}

export function saveAppSettings(settings) {
  const nextSettings = normalizeAppSettings(settings);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
  window.dispatchEvent(new CustomEvent('app-settings-change', { detail: nextSettings }));
}

export function formatMoney(value, settings = loadAppSettings()) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: settings.currency || 'USD',
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

export function formatDate(value, settings = loadAppSettings()) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  if (settings.dateFormat === 'mm/dd/yyyy') return `${month}/${day}/${year}`;
  if (settings.dateFormat === 'dd/mm/yyyy') return `${day}/${month}/${year}`;
  return `${year}-${month}-${day}`;
}

export function applyAppSettings(settings = loadAppSettings()) {
  const nextSettings = normalizeAppSettings(settings);
  const root = document.documentElement;
  root.dataset.font = nextSettings.font;
  root.dataset.currency = nextSettings.currency;
  root.classList.toggle('no-prop-firm', !nextSettings.propFirmEnabled);
  root.classList.toggle('simple-mode', nextSettings.simpleMode);

  if (nextSettings.customThemeEnabled) {
    root.style.setProperty('--background', nextSettings.customBackground);
    root.style.setProperty('--ink', nextSettings.customInk);
  } else {
    root.style.removeProperty('--background');
    root.style.removeProperty('--ink');
  }
}

export function normalizeAppSettings(settings = {}) {
  const nextSettings = { ...defaultSettings, ...settings };
  const fonts = ['geist', 'system', 'mono'];
  const dateFormats = ['yyyy-mm-dd', 'mm/dd/yyyy', 'dd/mm/yyyy'];
  const currencies = ['USD', 'PHP', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'];
  const propFirmEnabled = Boolean(nextSettings.propFirmEnabled);

  return {
    ...nextSettings,
    font: fonts.includes(nextSettings.font) ? nextSettings.font : defaultSettings.font,
    dateFormat: dateFormats.includes(nextSettings.dateFormat) ? nextSettings.dateFormat : defaultSettings.dateFormat,
    currency: currencies.includes(nextSettings.currency) ? nextSettings.currency : defaultSettings.currency,
    customBackground: normalizeHex(nextSettings.customBackground, defaultSettings.customBackground),
    customInk: normalizeHex(nextSettings.customInk, defaultSettings.customInk),
    customThemeEnabled: Boolean(nextSettings.customThemeEnabled),
    propFirmEnabled,
    simpleMode: !propFirmEnabled
  };
}

function normalizeHex(value, fallback) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}
