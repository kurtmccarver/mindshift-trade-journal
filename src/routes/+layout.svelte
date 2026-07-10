<script>
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import '../app.css';
  import { captureJournalSummary, captureModeChanged, capturePageViewed, initAnalytics } from '$lib/analytics.js';
  import { applyAppSettings, loadAppSettings, saveAppSettings } from '$lib/appSettings.js';
  import { createScheduledBackupIfDue } from '$lib/backupActions.js';

  const journalKey = 'minimal-trade-journal:v2';
  const onboardingKey = 'mindshift-onboarding-complete:v1';
  let themeIcon = 'moon';
  let showOnboarding = false;
  let selectedMode = 'simple';
  let onboardingStep = 1;
  let instructionsOpenedManually = false;
  let toasts = [];

  $: onboardingPages = selectedMode === 'simple'
    ? [
        ['Add Trade', 'A pinned quick-entry page for journaling a trade directly into the saved table.'],
        ['Dashboard', 'Shows the main workspace, performance PnL, win rate, RR gain, charts, pair/token distribution, optional caller chart, and recent trades.'],
        ['Trades', 'Lists every trade in one editable table. Filter by token, date, caller, notes, and type, edit cells inline, add custom columns, and delete selected trades.'],
        ['Backups', 'Creates local snapshots of your journal and settings so you can restore data if something changes unexpectedly.']
      ]
    : [
        ['Add Trade', 'A pinned quick-entry page for journaling a trade directly into the saved table.'],
        ['Dashboard', 'Shows prop firm beta challenge progress, target health, PnL, win rate, RR gain, charts, pair/token distribution, caller analysis, and recent trades.'],
        ['Trades', 'Lists every trade in one editable table. Filter by token, date, caller, notes, and type, edit cells inline, add custom columns, and delete selected trades.'],
        ['Calculator', 'A standalone volume calculator for quick position sizing using capital, risk, entry, stop, target, and value per lot.'],
        ['Rules Beta', 'Shows account capital, risk percent, phase one, phase two, funded targets, max daily loss, completion checks, and payout readiness.'],
        ['Backups', 'Creates local snapshots of your journal and settings so you can restore data if something changes unexpectedly.']
      ];

  function readJournalState() {
    try {
      return JSON.parse(localStorage.getItem(journalKey) || '{}');
    } catch {
      return {};
    }
  }

  function writeJournalState(nextState) {
    localStorage.setItem(journalKey, JSON.stringify(nextState));
  }

  function applyTheme() {
    const state = readJournalState();
    const theme = state.theme || 'system';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
    themeIcon = dark ? 'sun' : 'moon';
  }

  function toggleTheme() {
    const state = readJournalState();
    const isDark = document.documentElement.classList.contains('dark');
    const theme = isDark ? 'light' : 'dark';
    writeJournalState({ ...state, theme });
    applyTheme();
    window.dispatchEvent(new CustomEvent('journal-theme-change', { detail: theme }));
  }

  onMount(() => {
    const applyEverything = () => {
      applyAppSettings(loadAppSettings());
      applyTheme();
    };

    applyEverything();
    applyTheme();
    initAnalytics();
    showOnboarding = localStorage.getItem(onboardingKey) !== 'true';
    instructionsOpenedManually = false;
    selectedMode = loadAppSettings().simpleMode ? 'simple' : 'prop';
    createScheduledBackupIfDue('Scheduled Snapshot');
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyTheme);
    window.addEventListener('app-settings-change', applyEverything);
    window.addEventListener('app-settings-change', handlePersistedChange);
    window.addEventListener('journal-data-change', handlePersistedChange);
    window.addEventListener('storage', applyEverything);
    window.addEventListener('mindshift-open-instructions', openInstructions);
    window.addEventListener('mindshift-notify', handleNotify);

    return () => {
      media.removeEventListener('change', applyTheme);
      window.removeEventListener('app-settings-change', applyEverything);
      window.removeEventListener('app-settings-change', handlePersistedChange);
      window.removeEventListener('journal-data-change', handlePersistedChange);
      window.removeEventListener('storage', applyEverything);
      window.removeEventListener('mindshift-open-instructions', openInstructions);
      window.removeEventListener('mindshift-notify', handleNotify);
    };
  });

  afterNavigate(() => {
    if (typeof window !== 'undefined') {
      applyAppSettings(loadAppSettings());
      applyTheme();
      capturePageViewed(window.location.pathname);
    }
  });

  function finishOnboarding() {
    const currentSettings = loadAppSettings();
    const nextSettings = {
      ...currentSettings,
      simpleMode: selectedMode === 'simple',
      propFirmEnabled: selectedMode === 'prop'
    };
    saveAppSettings(nextSettings);
    captureModeChanged();
    applyAppSettings(nextSettings);
    localStorage.setItem(onboardingKey, 'true');
    showOnboarding = false;
    instructionsOpenedManually = false;
  }

  function skipOnboarding() {
    if (!instructionsOpenedManually) localStorage.setItem(onboardingKey, 'true');
    showOnboarding = false;
    instructionsOpenedManually = false;
  }

  function nextOnboardingStep() {
    onboardingStep = Math.min(3, onboardingStep + 1);
  }

  function previousOnboardingStep() {
    onboardingStep = Math.max(1, onboardingStep - 1);
  }

  function openInstructions() {
    selectedMode = loadAppSettings().simpleMode ? 'simple' : 'prop';
    onboardingStep = 1;
    instructionsOpenedManually = true;
    showOnboarding = true;
  }

  function handlePersistedChange() {
    createScheduledBackupIfDue('Scheduled Snapshot');
    captureJournalSummary('saved_data_changed');
  }

  function handleNotify(event) {
    notify(event.detail?.message || event.detail || 'Saved');
  }

  function notify(message) {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    toasts = [{ id, message }, ...toasts].slice(0, 4);
    setTimeout(() => {
      toasts = toasts.filter((toast) => toast.id !== id);
    }, 3200);
  }
</script>

<svelte:head>
  <link rel="icon" href="/favicon.ico" />
  <link rel="shortcut icon" href="/images/favicon.ico" />
</svelte:head>

<slot />

<button class="floating-theme-toggle icon-button" type="button" aria-label="Toggle theme" on:click={toggleTheme}>
  {#if themeIcon === 'sun'}&#9788;{:else}&#9790;{/if}
</button>

<div class="toast-stack" aria-live="polite" aria-atomic="false">
  {#each toasts as toast}
    <div class="toast">{toast.message}</div>
  {/each}
</div>

{#if showOnboarding}
  <div class="onboarding-overlay" role="presentation">
    <div class="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboardingTitle">
      <div class="onboarding-head">
        <p class="eyebrow">{instructionsOpenedManually ? 'instructions' : 'first run guide'}</p>
        <h2 id="onboardingTitle">how to use MindShift</h2>
        <p>Step {onboardingStep} of 3</p>
      </div>

      {#if onboardingStep === 1}
        <div class="onboarding-pages">
          <article>
            <strong>what this is</strong>
            <p>MindShift is a trade journal and risk workspace for tracking trades, sizing volume, and reviewing performance. Made by Kurt McCarver.</p>
          </article>
          <article>
            <strong>goal</strong>
            <p>It helps you journal faster, calculate risk cleaner, and see which pairs, setups, and results are actually working.</p>
          </article>
        </div>
      {:else if onboardingStep === 2}
        <div class="mode-choice" aria-label="Choose app mode">
          <label class:selected={selectedMode === 'simple'}>
            <input type="radio" bind:group={selectedMode} value="simple" />
            <span>
              <strong>simple mode</strong>
              <small>Choose this if you only want journal, dashboard, analytics, trades, and calculator tools. Prop firm beta rules stay hidden.</small>
            </span>
          </label>
          <label class:selected={selectedMode === 'prop'}>
            <input type="radio" bind:group={selectedMode} value="prop" />
            <span>
              <strong>prop firm mode beta</strong>
              <small>Beta test challenge rules, phases, targets, max losses, completion checks, and payout tracking.</small>
            </span>
          </label>
        </div>
      {:else}
        <div class="onboarding-pages">
          <p class="micro">pages in {selectedMode === 'simple' ? 'simple mode' : 'prop firm beta mode'}</p>
          {#each onboardingPages as page}
            <article>
              <strong>{page[0]}</strong>
              <p>{page[1]}</p>
            </article>
          {/each}
        </div>
      {/if}

      <div class="onboarding-actions">
        <button class="ghost-button" type="button" on:click={skipOnboarding}>{instructionsOpenedManually ? 'Close' : 'Skip'}</button>
        {#if onboardingStep > 1}
          <button class="ghost-button" type="button" on:click={previousOnboardingStep}>Back</button>
        {/if}
        {#if onboardingStep < 3}
          <button class="primary-button" type="button" on:click={nextOnboardingStep}>Next</button>
        {:else}
          <button class="primary-button" type="button" on:click={finishOnboarding}>{instructionsOpenedManually ? 'Apply And Close' : 'Save And Start'}</button>
        {/if}
      </div>
    </div>
  </div>
{/if}
