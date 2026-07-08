import { LEGACY_KEY, STORAGE_KEY, getEmptyJournal, loadJournalData } from './journalData.js';

export function saveJournalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('journal-data-change', { detail: data }));
}

export function resetJournalData() {
  localStorage.removeItem(LEGACY_KEY);
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
    'measurementMode',
    'entry',
    'exitPrice',
    'stopPrice',
    'takeProfit',
    'takeProfit1',
    'takeProfit2',
    'slPoints',
    'tp1Points',
    'tp2Points',
    'signalBy',
    'pointValue',
    'riskAmount',
    'lotSize',
    'rr',
    'estimatedGain',
    'result',
    'pnl',
    'notes',
    'rawSl',
    'rawTp',
    'rawTp1',
    'rawTp2'
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
      const entry = Number(item.entry) || 0;
      const exitPrice = Number(item.exitPrice) || 0;
      const slPoints = Number(item.slPoints) || 0;
      const tp1Points = Number(item.tp1Points) || Number(item.tpPoints) || 0;
      const tp2Points = Number(item.tp2Points) || 0;
      const targetPoints = tp1Points || tp2Points || 0;
      const pointValue = Number(item.pointValue) || Number(data.settings?.pointValue) || 1;
      const riskAmount = Number(item.riskAmount) || Number(data.settings?.capital || 0) * (Number(data.settings?.riskPercent || 0) / 100);
      const lotSize = Number(item.lotSize) || (slPoints > 0 && pointValue > 0 ? riskAmount / (slPoints * pointValue) : 0);
      const direction = item.direction || 'long';
      const result = normalizeResult(item.result);
      const pnl = exitPrice > 0
        ? (direction === 'long' ? exitPrice - entry : entry - exitPrice) * lotSize * pointValue
        : Number(item.pnl) || null;

      return {
        id: createId(),
        date: item.date || new Date().toISOString().slice(0, 10),
        symbol: (item.symbol || 'MANUAL').toUpperCase(),
        direction,
        measurementMode: item.measurementMode || 'points',
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
        signalBy: item.signalBy || '',
        pointValue,
        riskAmount,
        lotSize,
        rr: Number(item.rr) || (slPoints > 0 && targetPoints > 0 ? targetPoints / slPoints : 0),
        estimatedGain: Number(item.estimatedGain) || riskAmount * (slPoints > 0 && targetPoints > 0 ? targetPoints / slPoints : 0),
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
