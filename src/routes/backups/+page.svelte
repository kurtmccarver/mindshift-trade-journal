<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';
  import {
    createBackup,
    deleteBackup,
    downloadAllBackups,
    downloadBackup,
    importBackupFile,
    loadBackups,
    restoreBackup
  } from '$lib/backupActions.js';
  import { applyAppSettings, loadAppSettings } from '$lib/appSettings.js';

  let backups = [];
  let label = '';
  let notice = '';
  let restoreTarget = null;
  let importInput;

  onMount(() => {
    refresh();
    const handleChange = () => refresh();
    window.addEventListener('backup-data-change', handleChange);
    return () => window.removeEventListener('backup-data-change', handleChange);
  });

  $: totalTrades = backups.reduce((sum, backup) => sum + tradeCount(backup), 0);

  function refresh() {
    backups = loadBackups();
  }

  function makeBackup() {
    const backup = createBackup(label);
    label = '';
    refresh();
    flash(`Backup created: ${backupName(backup)}.`);
  }

  function askRestore(backup) {
    restoreTarget = backup;
  }

  function closeRestore() {
    restoreTarget = null;
  }

  function confirmRestore() {
    if (!restoreTarget) return;
    const result = restoreBackup(restoreTarget.id);
    if (result.ok) {
      applyAppSettings(loadAppSettings());
      flash(`Loaded backup: ${backupName(restoreTarget)}.`);
    } else {
      flash(result.message);
    }
    closeRestore();
  }

  function removeBackup(id) {
    backups = deleteBackup(id);
    flash('Backup removed.');
  }

  async function importBackup(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      const result = await importBackupFile(file);
      backups = result.backups;
      flash(result.count ? `${result.count} backup${result.count === 1 ? '' : 's'} imported.` : 'No valid backups found.');
    } catch {
      flash('Backup import failed. Use a MindShift backup JSON file.');
    } finally {
      event.currentTarget.value = '';
    }
  }

  function backupName(backup) {
    return backup.label || formatStamp(backup.createdAt);
  }

  function formatStamp(value) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  function tradeCount(backup) {
    return backup.snapshot?.journal?.trades?.length || 0;
  }

  function customColumnCount(backup) {
    return backup.snapshot?.journal?.customColumns?.length || 0;
  }

  function modeLabel(backup) {
    const settings = backup.snapshot?.appSettings || {};
    if (settings.simpleMode) return 'simple mode';
    if (settings.propFirmEnabled === false) return 'journal mode';
    return 'prop firm mode';
  }

  function handleRestoreOverlay(event) {
    if (event.target === event.currentTarget) closeRestore();
  }

  function flash(message) {
    notice = message;
    setTimeout(() => {
      notice = '';
    }, 2400);
  }
</script>

<svelte:head>
  <title>Backups | MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/backups" />

<main id="top" class="page-shell">
  <section class="hero compact-hero section-enter">
    <div class="halftone" aria-hidden="true"></div>
    <p class="eyebrow">local safety</p>
    <h1>backups.</h1>
    <p class="lede">
      Save full local snapshots of your journal, settings, custom columns, theme,
      and sidebar pins. Load a backup anytime from this browser.
    </p>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>01 - create backup</p>
      {#if notice}<span class="status-chip is-active">{notice}</span>{/if}
    </div>
    <div class="card backup-create-card">
      <label>
        <span>backup name optional</span>
        <input bind:value={label} type="text" maxlength="80" placeholder="Before changing settings, funded reset..." on:keydown={(event) => event.key === 'Enter' && makeBackup()} />
      </label>
      <div class="section-actions">
        <button class="primary-button" type="button" on:click={makeBackup}>create backup</button>
        <button class="ghost-button" type="button" on:click={() => importInput?.click()}>import backup</button>
        <input bind:this={importInput} type="file" accept="application/json,.json" hidden on:change={importBackup} />
        <button class="ghost-button" type="button" on:click={downloadAllBackups} disabled={!backups.length}>export all</button>
      </div>
    </div>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>02 - saved backups</p>
      <span class="status-chip">{backups.length} backups / {totalTrades} trades</span>
    </div>
    <div class="backup-grid">
      {#if backups.length}
        {#each backups as backup}
          <article class="card backup-card">
            <div>
              <p class="micro">{formatStamp(backup.createdAt)}</p>
              <h2>{backupName(backup)}</h2>
            </div>
            <div class="backup-meta">
              <span>{tradeCount(backup)} trades</span>
              <span>{customColumnCount(backup)} custom columns</span>
              <span>{modeLabel(backup)}</span>
            </div>
            <div class="section-actions">
              <button class="primary-button compact-button" type="button" on:click={() => askRestore(backup)}>load backup</button>
              <button class="ghost-button" type="button" on:click={() => downloadBackup(backup)}>export</button>
              <button class="danger-button" type="button" on:click={() => removeBackup(backup.id)}>delete</button>
            </div>
          </article>
        {/each}
      {:else}
        <div class="card empty-backup-card">
          <p class="empty-state">No backups yet. Create one before making big changes.</p>
        </div>
      {/if}
    </div>
  </section>
</main>

{#if restoreTarget}
  <div class="confirm-overlay is-visible" role="presentation" on:click={handleRestoreOverlay}>
    <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="restoreBackupTitle" tabindex="-1">
      <p class="micro">load backup</p>
      <h2 id="restoreBackupTitle">Restore this backup?</h2>
      <p>
        This will replace the current journal, settings, custom columns, theme,
        and pinned tabs with “{backupName(restoreTarget)}”.
      </p>
      <div class="confirm-actions">
        <button class="ghost-button" type="button" on:click={closeRestore}>cancel</button>
        <button class="primary-button" type="button" on:click={confirmRestore}>load backup</button>
      </div>
    </div>
  </div>
{/if}
