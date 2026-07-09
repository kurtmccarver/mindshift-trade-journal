import { SETTINGS_KEY, loadAppSettings, saveAppSettings } from './appSettings.js';
import { STORAGE_KEY, loadJournalData } from './journalData.js';
import { saveJournalData } from './journalActions.js';

export const BACKUP_KEY = 'mindshift-backups:v1';
export const PINNED_TABS_KEY = 'mindshift-pinned-tabs:v1';
const MAX_BACKUPS = 30;

export function loadBackups() {
  if (typeof localStorage === 'undefined') return [];

  try {
    const backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    return Array.isArray(backups) ? backups.map(normalizeBackup).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function createBackup(label = '') {
  const backup = {
    id: createId(),
    label: String(label || '').trim(),
    createdAt: new Date().toISOString(),
    version: 1,
    snapshot: createSnapshot()
  };
  const backups = [backup, ...loadBackups()].slice(0, MAX_BACKUPS);
  saveBackups(backups);
  return backup;
}

export function restoreBackup(id) {
  const backup = loadBackups().find((item) => item.id === id);
  if (!backup) return { ok: false, message: 'Backup not found.' };

  const snapshot = backup.snapshot || {};
  saveJournalData(snapshot.journal || loadJournalData());
  saveAppSettings(snapshot.appSettings || loadAppSettings());
  if (Array.isArray(snapshot.pinnedTabs)) {
    localStorage.setItem(PINNED_TABS_KEY, JSON.stringify(snapshot.pinnedTabs));
  }
  window.dispatchEvent(new CustomEvent('backup-restored', { detail: backup }));
  return { ok: true, backup };
}

export function deleteBackup(id) {
  const next = loadBackups().filter((backup) => backup.id !== id);
  saveBackups(next);
  return next;
}

export function downloadBackup(backup) {
  const safeBackup = normalizeBackup(backup);
  if (!safeBackup) return;
  const blob = new Blob([JSON.stringify(safeBackup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = safeBackup.createdAt.slice(0, 19).replace(/[:T]/g, '-');
  link.href = url;
  link.download = `mindshift-backup-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadAllBackups() {
  const blob = new Blob([JSON.stringify(loadBackups(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mindshift-backups.json';
  link.click();
  URL.revokeObjectURL(url);
}

export async function importBackupFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const incoming = Array.isArray(parsed) ? parsed : [parsed];
  const normalized = incoming.map(normalizeBackup).filter(Boolean);
  if (!normalized.length) return { count: 0, backups: loadBackups() };

  const existing = loadBackups();
  const existingIds = new Set(existing.map((backup) => backup.id));
  const imported = normalized.map((backup) => ({
    ...backup,
    id: existingIds.has(backup.id) ? createId() : backup.id
  }));
  const next = [...imported, ...existing].slice(0, MAX_BACKUPS);
  saveBackups(next);
  return { count: imported.length, backups: next };
}

function createSnapshot() {
  return {
    journal: loadJournalData(),
    appSettings: loadAppSettings(),
    pinnedTabs: readJson(PINNED_TABS_KEY, []),
    raw: {
      [STORAGE_KEY]: localStorage.getItem(STORAGE_KEY) || '',
      [SETTINGS_KEY]: localStorage.getItem(SETTINGS_KEY) || '',
      [PINNED_TABS_KEY]: localStorage.getItem(PINNED_TABS_KEY) || ''
    }
  };
}

function saveBackups(backups) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
  window.dispatchEvent(new CustomEvent('backup-data-change', { detail: backups }));
}

function normalizeBackup(backup) {
  if (!backup || typeof backup !== 'object') return null;
  const snapshot = backup.snapshot && typeof backup.snapshot === 'object' ? backup.snapshot : {};
  return {
    id: String(backup.id || createId()),
    label: String(backup.label || '').slice(0, 80),
    createdAt: validDate(backup.createdAt) ? backup.createdAt : new Date().toISOString(),
    version: Number(backup.version) || 1,
    snapshot: {
      journal: snapshot.journal && typeof snapshot.journal === 'object' ? snapshot.journal : { settings: {}, trades: [], customColumns: [] },
      appSettings: snapshot.appSettings && typeof snapshot.appSettings === 'object' ? snapshot.appSettings : {},
      pinnedTabs: Array.isArray(snapshot.pinnedTabs) ? snapshot.pinnedTabs.filter((item) => typeof item === 'string').slice(0, 8) : [],
      raw: snapshot.raw && typeof snapshot.raw === 'object' ? snapshot.raw : {}
    }
  };
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function validDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
