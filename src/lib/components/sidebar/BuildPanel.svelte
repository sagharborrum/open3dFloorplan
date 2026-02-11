<script lang="ts">
  import { selectedTool } from '$lib/stores/project';
  import type { Tool } from '$lib/stores/project';

  let activeTab = $state<'draw' | 'objects'>('draw');

  function setTool(tool: Tool) {
    selectedTool.set(tool);
  }

  let currentTool = $state<Tool>('select');
  selectedTool.subscribe((t) => { currentTool = t; });

  const furnitureItems = [
    { id: 'sofa', name: 'Sofa', category: 'Living Room' },
    { id: 'table', name: 'Dining Table', category: 'Dining' },
    { id: 'bed', name: 'Bed', category: 'Bedroom' },
    { id: 'desk', name: 'Desk', category: 'Office' },
    { id: 'toilet', name: 'Toilet', category: 'Bathroom' },
    { id: 'bathtub', name: 'Bathtub', category: 'Bathroom' },
    { id: 'stove', name: 'Stove', category: 'Kitchen' },
    { id: 'fridge', name: 'Fridge', category: 'Kitchen' },
  ];

  let search = $state('');

  let filtered = $derived(
    furnitureItems.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
  );
</script>

<div class="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
  <!-- Tabs -->
  <div class="flex border-b border-gray-200">
    <button
      class="flex-1 py-2 text-sm font-medium {activeTab === 'draw' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}"
      onclick={() => activeTab = 'draw'}
    >Draw</button>
    <button
      class="flex-1 py-2 text-sm font-medium {activeTab === 'objects' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}"
      onclick={() => activeTab = 'objects'}
    >Objects</button>
  </div>

  <div class="flex-1 overflow-y-auto p-3">
    {#if activeTab === 'draw'}
      <div class="space-y-2">
        <h3 class="text-xs font-semibold text-gray-400 uppercase">Tools</h3>
        <button
          class="w-full text-left px-3 py-2 rounded text-sm {currentTool === 'select' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}"
          onclick={() => setTool('select')}
        >↖ Select</button>
        <button
          class="w-full text-left px-3 py-2 rounded text-sm {currentTool === 'wall' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}"
          onclick={() => setTool('wall')}
        >▭ Draw Wall</button>

        <h3 class="text-xs font-semibold text-gray-400 uppercase mt-4">Construction</h3>
        <button
          class="w-full text-left px-3 py-2 rounded text-sm {currentTool === 'door' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}"
          onclick={() => setTool('door')}
        >🚪 Door</button>
        <button
          class="w-full text-left px-3 py-2 rounded text-sm {currentTool === 'window' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}"
          onclick={() => setTool('window')}
        >🪟 Window</button>
      </div>
    {:else}
      <div class="space-y-2">
        <input
          type="text"
          placeholder="Search furniture..."
          class="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
          bind:value={search}
        />
        {#each filtered as item}
          <button
            class="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-50"
            onclick={() => { /* TODO: furniture placement */ }}
          >
            <span class="text-gray-700">{item.name}</span>
            <span class="text-xs text-gray-400 ml-1">{item.category}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
