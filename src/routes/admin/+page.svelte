<script>
  import { onMount } from 'svelte';
  import AppSidebar from '$lib/AppSidebar.svelte';

  let token = '';
  let feedback = [];
  let status = '';
  let loading = false;

  onMount(() => {
    token = sessionStorage.getItem('mindshift-admin-token') || '';
    if (token) loadFeedback();
  });

  async function loadFeedback() {
    status = '';
    loading = true;
    sessionStorage.setItem('mindshift-admin-token', token);

    try {
      const response = await fetch('/api/admin/feedback', {
        headers: { 'x-admin-token': token }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Feedback could not be loaded.');
      feedback = result.feedback || [];
      status = `${feedback.length} feedback item${feedback.length === 1 ? '' : 's'} loaded.`;
    } catch (error) {
      status = error.message || 'Feedback could not be loaded.';
      feedback = [];
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Admin Feedback | MindShift Trade Journal</title>
</svelte:head>

<AppSidebar current="/admin" />

<main class="page-shell">
  <section class="hero compact-hero section-enter">
    <p class="eyebrow">admin</p>
    <h1>feedback.</h1>
    <p class="lede">Read sidebar feedback submitted through the Supabase feedback table.</p>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>01 - access</p>
      {#if status}<span class="status-chip is-active">{status}</span>{/if}
    </div>
    <form class="card quote-line custom-entry" on:submit|preventDefault={loadFeedback}>
      <label>
        <span>admin token</span>
        <input bind:value={token} type="password" placeholder="FEEDBACK_ADMIN_TOKEN" />
      </label>
      <button class="primary-button" type="submit" disabled={loading || !token}>
        {loading ? 'loading...' : 'load feedback'}
      </button>
    </form>
  </section>

  <section class="section-enter">
    <div class="section-heading">
      <p>02 - submissions</p>
      <button class="ghost-button" type="button" on:click={loadFeedback} disabled={loading || !token}>Refresh</button>
    </div>
    <div class="feedback-list">
      {#if feedback.length}
        {#each feedback as item}
          <article class="card feedback-card">
            <div class="feedback-card-head">
              <div>
                <strong>{item.name}</strong>
                <span>{new Date(item.created_at).toLocaleString()}</span>
              </div>
              {#if item.community}<span class="status-chip">{item.community}</span>{/if}
            </div>
            {#if item.heard_from}<p class="micro">heard from: {item.heard_from}</p>{/if}
            <p>{item.feedback}</p>
          </article>
        {/each}
      {:else}
        <div class="card">
          <p class="empty-state">No feedback loaded yet.</p>
        </div>
      {/if}
    </div>
  </section>
</main>
