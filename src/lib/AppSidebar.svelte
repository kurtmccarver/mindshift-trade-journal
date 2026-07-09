<script>
  import { onMount } from 'svelte';
  import { loadAppSettings } from '$lib/appSettings.js';

  export let current = '/';

  const links = [
    { href: '/add-trade', label: '00 - add trade', autoPinned: true },
    { href: '/', label: '01 - home' },
    { href: '/dashboard', label: '02 - dashboard' },
    { href: '/trades', label: '03 - trades' },
    { href: '/calculator', label: '04 - calculator' },
    { href: '/#rules', label: '05 - rules', propFirmOnly: true }
  ];

  const settingsLink = { href: '/settings', label: 'Settings' };
  const backupLink = { href: '/backups', label: 'Backup' };

  let pinned = [];
  let kofiContainer;
  let appSettings = loadAppSettings();
  let feedbackOpen = false;
  let feedbackStatus = '';
  let feedbackSubmitting = false;
  let feedbackForm = {
    name: '',
    community: '',
    heardFrom: '',
    feedback: ''
  };

  onMount(() => {
    refreshSidebarState();

    loadKofiWidget();
    window.addEventListener('app-settings-change', refreshSidebarState);
    window.addEventListener('backup-restored', refreshSidebarState);
    window.addEventListener('storage', refreshSidebarState);
    return () => {
      window.removeEventListener('app-settings-change', refreshSidebarState);
      window.removeEventListener('backup-restored', refreshSidebarState);
      window.removeEventListener('storage', refreshSidebarState);
    };
  });

  $: visibleLinks = links.filter(linkVisible);
  $: autoPinnedLinks = visibleLinks.filter((link) => link.autoPinned);
  $: userPinnedLinks = visibleLinks.filter((link) => !link.autoPinned && pinned.includes(link.href));
  $: pinnedLinks = [...autoPinnedLinks, ...userPinnedLinks];
  $: unpinnedLinks = visibleLinks.filter((link) => !link.autoPinned && !pinned.includes(link.href));

  function togglePin(href) {
    pinned = pinned.includes(href) ? pinned.filter((item) => item !== href) : [href, ...pinned].slice(0, 4);
    localStorage.setItem('mindshift-pinned-tabs:v1', JSON.stringify(pinned));
  }

  function linkVisible(link) {
    if (link.propFirmOnly && !appSettings.propFirmEnabled) return false;
    if (appSettings.simpleMode && (link.href === '/#rules' || link.href === '/calculator')) return false;
    return true;
  }

  function refreshSidebarState() {
    appSettings = loadAppSettings();
    try {
      pinned = JSON.parse(localStorage.getItem('mindshift-pinned-tabs:v1') || '[]');
    } catch {
      pinned = [];
    }
    const nextVisibleLinks = links.filter(linkVisible);
    pinned = pinned.filter((href) => nextVisibleLinks.some((link) => link.href === href));
  }

  function isActive(href) {
    return current === href || (href !== '/' && current.startsWith(href));
  }

  function openInstructions() {
    window.dispatchEvent(new CustomEvent('mindshift-open-instructions'));
  }

  function loadKofiWidget() {
    if (!kofiContainer) return;

    const renderWidget = () => {
      if (!window.kofiwidget2) return;
      window.kofiwidget2.init('Support me on Ko-fi', '#16a34a', 'H1D321ZGN8');
      kofiContainer.innerHTML = window.kofiwidget2.getHTML();
    };

    if (window.kofiwidget2) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector('script[data-kofi-widget]');
    if (existingScript) {
      existingScript.addEventListener('load', renderWidget, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
    script.async = true;
    script.dataset.kofiWidget = 'true';
    script.addEventListener('load', renderWidget, { once: true });
    document.head.appendChild(script);
  }

  async function submitFeedback() {
    feedbackStatus = '';
    if (!feedbackForm.name.trim() || !feedbackForm.feedback.trim()) {
      feedbackStatus = 'Name and feedback are required.';
      return;
    }

    feedbackSubmitting = true;
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...feedbackForm, pageUrl: window.location.href })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Feedback was not sent.');
      feedbackStatus = 'Feedback sent. Thank you.';
      feedbackForm = { name: '', community: '', heardFrom: '', feedback: '' };
      feedbackOpen = false;
    } catch (error) {
      feedbackStatus = error.message || 'Feedback was not sent.';
    } finally {
      feedbackSubmitting = false;
    }
  }
</script>

<aside class="sidebar" aria-label="Primary navigation">
  <a class="brand" href="/" aria-label="MindShift Trade Journal home">
    <span class="logo-mark">
      <img class="logo-light" src="/images/mindshift-logo-black.png" alt="MindShift" />
      <img class="logo-dark" src="/images/mindshift-logo-white.png" alt="MindShift" />
    </span>
  </a>
  <nav>
    {#if pinnedLinks.length}
      <div class="nav-group">
        <p class="nav-label">pinned</p>
        {#each pinnedLinks as link}
          <div class="nav-item" class:is-active={isActive(link.href)}>
            <a href={link.href}>{link.label}</a>
            {#if !link.autoPinned}
              <button type="button" aria-label={`Unpin ${link.label}`} title="Unpin" on:click={() => togglePin(link.href)}>-</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <div class="nav-group">
      <p class="nav-label">tabs</p>
      {#each unpinnedLinks as link}
        <div class="nav-item" class:is-active={isActive(link.href)}>
          <a href={link.href}>{link.label}</a>
          <button type="button" aria-label={`Pin ${link.label}`} title="Pin" on:click={() => togglePin(link.href)}>+</button>
        </div>
      {/each}
    </div>
  </nav>

  <div class="sidebar-settings-group" aria-label="Settings navigation">
    <a class="sidebar-settings" class:is-active={isActive(settingsLink.href)} href={settingsLink.href}>{settingsLink.label}</a>
    <a class="sidebar-settings" class:is-active={isActive(backupLink.href)} href={backupLink.href}>{backupLink.label}</a>
    <button class="sidebar-link-button" type="button" on:click={openInstructions}>Instructions</button>
  </div>
  <div class="sidebar-feedback">
    <button class="feedback-toggle" type="button" on:click={() => (feedbackOpen = true)}>
      Send Feedback
    </button>
    {#if feedbackStatus}<p class="feedback-status">{feedbackStatus}</p>{/if}
  </div>
  <div class="sidebar-kofi" bind:this={kofiContainer} aria-label="Support me on Ko-fi"></div>
</aside>

<header class="topbar">
  <a class="brand" href="/">
    <span class="logo-mark">
      <img class="logo-light" src="/images/mindshift-logo-black.png" alt="MindShift" />
      <img class="logo-dark" src="/images/mindshift-logo-white.png" alt="MindShift" />
    </span>
  </a>
</header>

{#if feedbackOpen}
  <div class="feedback-modal-overlay" role="presentation" on:click={(event) => event.target === event.currentTarget && (feedbackOpen = false)}>
    <div class="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedbackTitle">
      <form on:submit|preventDefault={submitFeedback}>
        <div class="modal-head">
          <p class="eyebrow">feedback</p>
          <h2 id="feedbackTitle">Send Feedback</h2>
          <p>Share what should improve. This is the only form connected to Supabase.</p>
        </div>
        <label>
          <span>name</span>
          <input bind:value={feedbackForm.name} type="text" maxlength="80" placeholder="Name" autocomplete="name" />
        </label>
        <label>
          <span>community</span>
          <input bind:value={feedbackForm.community} type="text" maxlength="120" placeholder="Optional" autocomplete="organization" />
        </label>
        <label>
          <span>heard from</span>
          <input bind:value={feedbackForm.heardFrom} type="text" maxlength="140" placeholder="Friend, TikTok, Discord..." />
        </label>
        <label>
          <span>feedback</span>
          <textarea bind:value={feedbackForm.feedback} rows="5" maxlength="1200" placeholder="What should improve?"></textarea>
        </label>
        {#if feedbackStatus}<p class="feedback-status">{feedbackStatus}</p>{/if}
        <div class="confirm-actions">
          <button class="ghost-button" type="button" on:click={() => (feedbackOpen = false)}>Cancel</button>
          <button class="primary-button" type="submit" disabled={feedbackSubmitting}>
            {feedbackSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
