import { LEGACY_KEY, RECOVERY_KEY, STORAGE_KEY, getEmptyJournal, loadJournalData, normalizeJournalData } from './journalData.js';

export function saveJournalData(data, options = {}) {
  const previous = localStorage.getItem(STORAGE_KEY);
  if (previous) localStorage.setItem(RECOVERY_KEY, previous);
  const normalized = normalizeJournalData(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...normalized, savedAt: new Date().toISOString() }));
  if (options.notify !== false) {
    window.dispatchEvent(new CustomEvent('journal-data-change', { detail: normalized }));
  }
}

export function resetJournalData() {
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(RECOVERY_KEY);
  saveJournalData({
    settings: {},
    trades: [],
    customColumns: [],
    selectedMarket: null,
    theme: loadJournalData().theme || 'system'
  });
}

export function createColumnKey(label, columns = []) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'column';
  let key = base;
  let index = 2;
  while (columns.some((column) => column.key === key)) {
    key = `${base}_${index}`;
    index += 1;
  }
  return key;
}

export function normalizeColumnLabel(label) {
  const cleanLabel = String(label || '').trim().replace(/\s+/g, ' ');
  if (/signal|strategy|setup|mentor|source/i.test(cleanLabel)) return 'signal by';
  return cleanLabel;
}

export function addJournalColumn(label) {
  const data = loadJournalData();
  const cleanLabel = normalizeColumnLabel(label);
  if (!cleanLabel) return { ok: false, message: 'Column name required.' };
  if (data.customColumns.some((column) => column.label.toLowerCase() === cleanLabel.toLowerCase())) {
    return { ok: false, message: 'Column already exists.' };
  }

  const next = {
    ...data,
    customColumns: [
      ...data.customColumns,
      { id: createId(), key: createColumnKey(cleanLabel, data.customColumns), label: cleanLabel }
    ]
  };
  saveJournalData(next);
  return { ok: true, data: next, message: `${cleanLabel} column added.` };
}

export function deleteTradesById(ids) {
  const idSet = new Set(ids);
  const data = loadJournalData();
  const next = {
    ...data,
    trades: data.trades.filter((trade) => !idSet.has(trade.id))
  };
  saveJournalData(next);
  return next;
}

export function exportJournalCsv(data = loadJournalData()) {
  const baseHeader = [
    'date',
    'symbol',
    'direction',
    'margin',
    'entry',
    'exitPrice',
    'stopPrice',
    'pnlPercent',
    'caller',
    'pointValue',
    'riskAmount',
    'lotSize',
    'rr',
    'estimatedGain',
    'result',
    'pnl',
    'notes',
    'rawSl'
  ];
  const customHeader = data.customColumns.map((column) => `custom:${column.label}`);
  const header = [...baseHeader, ...customHeader];
  const lines = data.trades.map((trade) =>
    header
      .map((key) => {
        const customColumn = key.startsWith('custom:')
          ? data.customColumns.find((column) => `custom:${column.label}` === key)
          : null;
        const value = customColumn ? trade.customFields?.[customColumn.key] || '' : trade[key] ?? '';
        return `"${String(value).replaceAll('"', '""')}"`;
      })
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

export function downloadJournalCsv() {
  const blob = new Blob([exportJournalCsv()], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'trade-journal.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export async function importJournalCsvFile(file) {
  const text = await file.text();
  return importJournalCsv(text);
}

export function importJournalCsv(text) {
  const data = loadJournalData();
  const rows = parseCsv(text);
  const [header = [], ...records] = rows;
  const keys = header.map((item) => item.trim());
  const customColumns = [...data.customColumns];
  const customImports = keys
    .filter((key) => key.toLowerCase().startsWith('custom:'))
    .map((key) => {
      const label = normalizeColumnLabel(key.slice('custom:'.length));
      if (!label) return null;
      const existing = customColumns.find((column) => column.label.toLowerCase() === label.toLowerCase());
      if (existing) return { header: key, column: existing };
      const column = { id: createId(), key: createColumnKey(label, customColumns), label };
      customColumns.push(column);
      return { header: key, column };
    })
    .filter(Boolean);

  const imported = records
    .map((record) => {
      const item = Object.fromEntries(keys.map((key, index) => [key, record[index] ?? '']));
      const entry = parseNumber(item.entry);
      const exitPrice = parseNumber(item.exitPrice);
      const stopPrice = parseNumber(item.stopPrice) || parseNumber(item.rawSl);
      const slPoints = parseNumber(item.slPoints) || (entry > 0 && stopPrice > 0 ? Math.abs(entry - stopPrice) : 0);
      const pointValue = parseNumber(item.pointValue) || Number(data.settings?.pointValue) || 1;
      const margin = parseNumber(item.margin) || parseNumber(item.riskAmount) || Number(data.settings?.capital || 0) * (Number(data.settings?.riskPercent || 0) / 100);
      const riskAmount = parseNumber(item.riskAmount) || margin;
      const lotSize = parseNumber(item.lotSize) || (slPoints > 0 && pointValue > 0 ? riskAmount / (slPoints * pointValue) : 0);
      const direction = item.direction || 'long';
      const result = normalizeResult(item.result);
      const pnl = exitPrice > 0
        ? (direction === 'long' ? exitPrice - entry : entry - exitPrice) * lotSize * pointValue
        : Number(item.pnl) || null;
      const pnlPercent = entry > 0 && exitPrice > 0
        ? ((direction === 'short' ? entry - exitPrice : exitPrice - entry) / entry) * 100
        : parseNumber(item.pnlPercent);

      return {
        id: createId(),
        date: item.date || new Date().toISOString().slice(0, 10),
        symbol: (item.symbol || '0').toUpperCase(),
        direction,
        measurementMode: item.measurementMode || 'price',
        margin,
        entry,
        exitPrice,
        stopPrice,
        takeProfit: 0,
        takeProfit1: 0,
        takeProfit2: 0,
        takeProfit3: 0,
        slPoints,
        tpPoints: 0,
        tp1Points: 0,
        tp2Points: 0,
        tp3Points: 0,
        rawSl: parseNumber(item.rawSl) || stopPrice || slPoints,
        rawTp: 0,
        rawTp1: 0,
        rawTp2: 0,
        rawTp3: 0,
        signalBy: item.signalBy || item.caller || '',
        caller: item.caller || item.signalBy || '',
        pointValue,
        riskAmount,
        lotSize,
        rr: parseNumber(item.rr),
        estimatedGain: parseNumber(item.estimatedGain),
        pnlPercent,
        pnl,
        result: result || (pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'open'),
        notes: item.notes || '',
        customFields: Object.fromEntries(customImports.map(({ header: customHeader, column }) => [column.key, item[customHeader] || '']))
      };
    })
    .filter((trade) => trade.symbol);

  const next = {
    ...data,
    customColumns,
    trades: [...imported, ...data.trades]
  };
  saveJournalData(next);
  return { data: next, count: imported.length };
}

function parseNumber(value) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeResult(value) {
  const result = String(value || '').trim().toLowerCase();
  return ['open', 'win', 'loss', 'breakeven'].includes(result) ? result : '';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
