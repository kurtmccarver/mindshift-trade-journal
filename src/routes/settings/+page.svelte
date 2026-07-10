<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';
  import { applyAppSettings, defaultSettings, loadAppSettings, normalizeAppSettings, saveAppSettings } from '$lib/appSettings.js';
  import { downloadJournalCsv, importJournalCsvFile, resetJournalData } from '$lib/journalActions.js';

  let settings = { ...defaultSettings };
  let saved = false;
  let confirmOpen = false;
  let importInput;

  onMount(() => {
    settings = loadAppSettings();
    applyAppSettings(settings);
  });

  function persist() {
    settings = normalizeAppSettings(settings);
    saveAppSettings(settings);
    applyAppSettings(settings);
    saved = true;
    setTimeout(() => {
      saved = false;
    }, 1800);
  }

  function resetTheme() {
    settings = {
      ...settings,
      customBackground: defaultSettings.customBackground,
      customInk: defaultSettings.customInk,
      customThemeEnabled: false
    };
    persist();
  }

  function setMode(mode) {
    settings = {
      ...settings,
      propFirmEnabled: mode === 'prop',
      simpleMode: mode !== 'prop'
    };
    persist();
  }

  function updateColor(key, value) {
    settings = {
      ...settings,
      [key]: value,
      customThemeEnabled: true
    };
    persist();
  }

  async function importCsv(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    await importJournalCsvFile(file);
    event.currentTarget.value = '';
    saved = true;
    setTimeout(() => {
      saved = false;
    }, 1800);
  }

  function confirmReset() {
    confirmOpen = true;
  }

  function closeConfirm() {
    confirmOpen = false;
  }

  function handleConfirmOverlay(event) {
    if (event.target === event.currentTarget) closeConfirm();
  }

  function resetAllData() {
    resetJournalData();
    closeConfirm();
    saved = true;
  }
</script>

<svelte:head>
  <title>Settings | MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/settings" />

<main id="top" class="page-shell">
  <section class="hero section-enter">
    <div class="halftone" aria-hidden="true"></div>
    <p class="eyebrow">preferences</p>
    <h1>settings.</h1>
    <p class="lede">
      Tune the journal display, currency, dates, theme colors, and prop firm
      features without changing your saved trades.
    </p>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>01 - display</p>
      {#if saved}<span class="status-chip">saved</span>{/if}
    </div>
    <div class="card">
      <div class="form-grid">
        <label>
          <span>font</span>
          <select bind:value={settings.font} on:change={persist}>
            <option value="geist">Geist</option>
            <option value="system">System</option>
            <option value="mono">Mono</option>
          </select>
        </label>
        <label>
          <span>date format</span>
          <select bind:value={settings.dateFormat} on:change={persist}>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
            <option value="mm/dd/yyyy">MM/DD/YYYY</option>
            <option value="dd/mm/yyyy">DD/MM/YYYY</option>
          </select>
        </label>
        <label>
          <span>prices currency</span>
          <select bind:value={settings.currency} on:change={persist}>
            <option value="USD">USD</option>
            <option value="PHP">PHP</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
            <option value="AUD">AUD</option>
            <option value="CAD">CAD</option>
            <option value="SGD">SGD</option>
          </select>
        </label>
      </div>
    </div>
  </section>

  <section class="section-enter">
    <div class="section-heading"><p>02 - custom theme</p></div>
    <div class="card">
      <div class="pretty p-svg p-curve p-thick app-checkbox settings-check">
        <input id="customThemeEnabled" type="checkbox" bind:checked={settings.customThemeEnabled} on:change={persist} />
        <div class="state p-primary">
          <svg class="svg svg-icon" viewBox="0 0 20 20"><path d="M7.6 14.2 3.8 10.4 5.2 9l2.4 2.4 7.2-7.2 1.4 1.4z" /></svg>
          <label for="customThemeEnabled">use custom colors</label>
        </div>
      </div>
      <div class="form-grid settings-colors">
        <label>
          <span>background</span>
          <input type="color" value={settings.customBackground} on:input={(event) => updateColor('customBackground', event.currentTarget.value)} />
        </label>
        <label>
          <span>text / ink</span>
          <input type="color" value={settings.customInk} on:input={(event) => updateColor('customInk', event.currentTarget.value)} />
        </label>
      </div>
      <button class="ghost-button" type="button" on:click={resetTheme}>Reset Custom Theme</button>
    </div>
  </section>

  <section class="section-enter">
    <div class="section-heading"><p>03 - features</p></div>
    <div class="card">
      <div class="feature-rows">
        <div class="feature-row">
          <div>
            <p class="micro">prop firm</p>
            <p class="settings-note price-source">Show or hide the challenge rules workspace.</p>
          </div>
          <div class="pretty p-svg p-curve p-thick app-checkbox settings-check">
            <input id="propFirmEnabled" type="checkbox" checked={settings.propFirmEnabled} on:change={() => setMode('prop')} />
            <div class="state p-primary">
              <svg class="svg svg-icon" viewBox="0 0 20 20"><path d="M7.6 14.2 3.8 10.4 5.2 9l2.4 2.4 7.2-7.2 1.4 1.4z" /></svg>
              <label for="propFirmEnabled">enabled</label>
            </div>
          </div>
        </div>
        <div class="feature-row">
          <div>
            <p class="micro">simple mode</p>
            <p class="settings-note price-source">Only show analytics and journal on the home workspace. Data stays saved.</p>
          </div>
          <div class="pretty p-svg p-curve p-thick app-checkbox settings-check">
            <input id="simpleMode" type="checkbox" checked={settings.simpleMode} on:change={() => setMode('simple')} />
            <div class="state p-primary">
              <svg class="svg svg-icon" viewBox="0 0 20 20"><path d="M7.6 14.2 3.8 10.4 5.2 9l2.4 2.4 7.2-7.2 1.4 1.4z" /></svg>
              <label for="simpleMode">enabled</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section-enter">
    <div class="section-heading"><p>04 - data</p></div>
    <div class="card data-actions-card">
      <div>
        <p class="micro">journal files</p>
        <p class="settings-note price-source">Import and export your local trade journal as CSV. Reset clears saved trades, rules, custom columns, and workspace settings on this browser.</p>
      </div>
      <div class="section-actions">
        <button class="ghost-button" type="button" on:click={() => importInput?.click()}>Import CSV</button>
        <input bind:this={importInput} type="file" accept=".csv,text/csv" hidden on:change={importCsv} />
        <button class="ghost-button" type="button" on:click={downloadJournalCsv}>Export CSV</button>
        <a class="ghost-button" href="/backups">Manage Backups</a>
        <button class="danger-button" type="button" on:click={confirmReset}>Reset Data</button>
      </div>
    </div>
  </section>

  <section class="section-enter">
    <div class="section-heading"><p>05 - legal</p></div>
    <div class="card legal-link-card">
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms And Conditions</a>
    </div>
  </section>
</main>

{#if confirmOpen}
  <div class="confirm-overlay is-visible" role="presentation" on:click={handleConfirmOverlay}>
    <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="settingsConfirmTitle" tabindex="-1">
      <p class="micro">confirmation</p>
      <h2 id="settingsConfirmTitle">Reset all data?</h2>
      <p>Reset saved trades, rules, custom columns, and journal settings? This cannot be undone.</p>
      <div class="confirm-actions">
        <button class="ghost-button" type="button" on:click={closeConfirm}>Cancel</button>
        <button class="danger-button" type="button" on:click={resetAllData}>Reset</button>
      </div>
    </div>
  </div>
{/if}

