<script lang="ts">
  import { selectedElementIds } from '$lib/stores/project';
  import { alignElements, type AlignmentOp } from '$lib/utils/alignment';

  let multiCount = $state(0);
  selectedElementIds.subscribe(ids => { multiCount = ids.size; });

  function doAlign(op: AlignmentOp) {
    let ids: Set<string>;
    selectedElementIds.subscribe(v => { ids = v; })();
    alignElements(ids!, op);
  }

  const buttons: { op: AlignmentOp; title: string; icon: string }[] = [
    { op: 'align-left', title: 'Align Left', icon: 'M4 3v18M8 8h12M8 16h8' },
    { op: 'align-center-h', title: 'Center Horizontal', icon: 'M12 3v18M6 8h12M8 16h8' },
    { op: 'align-right', title: 'Align Right', icon: 'M20 3v18M4 8h12M8 16h8' },
    { op: 'align-top', title: 'Align Top', icon: 'M3 4h18M8 8v12M16 8v8' },
    { op: 'align-center-v', title: 'Center Vertical', icon: 'M3 12h18M8 6v12M16 8v8' },
    { op: 'align-bottom', title: 'Align Bottom', icon: 'M3 20h18M8 4v12M16 8v8' },
    { op: 'distribute-h', title: 'Distribute Horizontally', icon: 'M4 3v18M20 3v18M9 8h6M9 16h6' },
    { op: 'distribute-v', title: 'Distribute Vertically', icon: 'M3 4h18M3 20h18M8 9v6M16 9v6' },
  ];
</script>

{#if multiCount >= 2}
  <div class="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-gray-200 px-1.5 py-1">
    <span class="text-xs text-gray-400 px-1 select-none">{multiCount} selected</span>
    <div class="w-px h-5 bg-gray-200 mx-0.5"></div>
    {#each buttons as btn}
      <button
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
        title={btn.title}
        aria-label={btn.title}
        onclick={() => doAlign(btn.op)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d={btn.icon}/></svg>
      </button>
      {#if btn.op === 'align-right' || btn.op === 'align-bottom'}
        <div class="w-px h-5 bg-gray-200 mx-0.5"></div>
      {/if}
    {/each}
  </div>
{/if}
