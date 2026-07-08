<script>
  import { createEventDispatcher } from 'svelte';

  export let value = '';
  export let options = [];
  export let ariaLabel = 'Select option';
  export let tone = '';

  let open = false;
  let shell;
  const dispatch = createEventDispatcher();

  $: selected = options.find((option) => option.value === value) || options[0] || { label: '', value: '' };

  function choose(nextValue) {
    value = nextValue;
    open = false;
    dispatch('change', nextValue);
  }

  function handleDocumentClick(event) {
    if (shell && !shell.contains(event.target)) open = false;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') open = false;
  }
</script>

<svelte:window on:click={handleDocumentClick} on:keydown={handleKeydown} />

<div bind:this={shell} class={`select-shell ${open ? 'is-open' : ''} ${tone ? `side-tone-${tone}` : ''}`}>
  <button class="select-trigger" type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} on:click={() => (open = !open)}>
    {selected.label}
  </button>
  <div class="select-menu" role="listbox" hidden={!open}>
    {#each options as option}
      <button
        class="select-option"
        class:is-selected={option.value === value}
        type="button"
        role="option"
        aria-selected={option.value === value}
        on:click={() => choose(option.value)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>
