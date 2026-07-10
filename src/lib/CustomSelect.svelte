<script>
  import { createEventDispatcher, onDestroy, tick } from 'svelte';

  export let value = '';
  export let options = [];
  export let ariaLabel = 'Select option';
  export let tone = '';

  let open = false;
  let shell;
  let menu;
  let menuStyle = '';
  const dispatch = createEventDispatcher();

  $: selected = options.find((option) => option.value === value) || options[0] || { label: '', value: '' };

  async function toggleOpen() {
    open = !open;
    if (open) {
      await tick();
      portalMenu();
      positionMenu();
    }
  }

  function positionMenu() {
    if (!shell || !menu) return;
    const rect = shell.getBoundingClientRect();
    const gap = 6;
    const menuHeight = Math.min(240, options.length * 44 + 14);
    const opensUp = rect.bottom + gap + menuHeight > window.innerHeight && rect.top > menuHeight;
    const top = opensUp ? rect.top - menuHeight - gap : rect.bottom + gap;
    menuStyle = `position: fixed; left: ${rect.left}px; top: ${Math.max(8, top)}px; width: ${rect.width}px;`;
  }

  function choose(nextValue) {
    value = nextValue;
    open = false;
    dispatch('change', nextValue);
  }

  function handleDocumentClick(event) {
    if (shell?.contains(event.target) || menu?.contains(event.target)) return;
    open = false;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') open = false;
  }

  function handleViewportChange() {
    if (open) positionMenu();
  }

  function portalMenu() {
    if (menu && menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
  }

  onDestroy(() => {
    menu?.remove();
  });
</script>

<svelte:window on:click={handleDocumentClick} on:keydown={handleKeydown} on:scroll={handleViewportChange} on:resize={handleViewportChange} />

<div bind:this={shell} class={`select-shell ${open ? 'is-open' : ''} ${tone ? `side-tone-${tone}` : ''}`}>
  <button class="select-trigger" type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} on:click={toggleOpen}>
    {selected.label}
  </button>
  <div bind:this={menu} class="select-menu" class:is-fixed={open} style={menuStyle} role="listbox" hidden={!open}>
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
