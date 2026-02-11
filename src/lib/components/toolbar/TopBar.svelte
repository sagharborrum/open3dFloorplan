<script lang="ts">
  import { currentProject, viewMode, undo, redo, addFloor, setActiveFloor, updateProjectName } from '$lib/stores/project';
  import { localStore } from '$lib/services/datastore';
  import { get } from 'svelte/store';
  import type { Floor } from '$lib/models/types';

  let projectName = $state('');
  let mode = $state<'2d' | '3d'>('2d');
  let floors: Floor[] = $state([]);
  let activeFloorId = $state('');
  let editingName = $state(false);

  currentProject.subscribe((p) => {
    if (p) {
      projectName = p.name;
      floors = p.floors;
      activeFloorId = p.activeFloorId;
    }
  });
  viewMode.subscribe((m) => { mode = m; });

  function setMode(m: '2d' | '3d') {
    viewMode.set(m);
  }

  function onNameBlur() {
    editingName = false;
    updateProjectName(projectName);
  }

  function onNameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }

  function onAddFloor() {
    addFloor(`Floor ${floors.length + 1}`);
  }

  function onFloorChange(e: Event) {
    setActiveFloor((e.target as HTMLSelectElement).value);
  }

  async function save() {
    const p = get(currentProject);
    if (p) {
      await localStore.save(p);
      alert('Project saved!');
    }
  }
</script>

<div class="h-12 bg-gradient-to-r from-green-600 to-green-700 flex items-center px-4 gap-3 shrink-0 shadow-sm">
  <!-- Project name -->
  {#if editingName}
    <input
      type="text"
      bind:value={projectName}
      onblur={onNameBlur}
      onkeydown={onNameKeydown}
      class="bg-white/20 text-white font-semibold px-2 py-0.5 rounded border border-white/30 outline-none text-sm w-40"
      autofocus
    />
  {:else}
    <button
      class="font-semibold text-white text-sm hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
      onclick={() => editingName = true}
      title="Click to rename"
    >{projectName}</button>
  {/if}

  <div class="h-5 w-px bg-white/20"></div>

  <!-- Floor selector -->
  <select
    value={activeFloorId}
    onchange={onFloorChange}
    class="bg-white/15 text-white text-sm rounded px-2 py-1 border border-white/20 outline-none cursor-pointer"
  >
    {#each floors as fl}
      <option value={fl.id} class="text-gray-800">{fl.name}</option>
    {/each}
  </select>
  <button
    onclick={onAddFloor}
    class="text-white/80 hover:text-white text-sm hover:bg-white/10 px-2 py-1 rounded transition-colors"
    title="Add Floor"
  >+ Floor</button>

  <div class="flex-1"></div>

  <button onclick={undo} class="px-2 py-1 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors" title="Undo">↶</button>
  <button onclick={redo} class="px-2 py-1 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors" title="Redo">↷</button>

  <div class="h-5 w-px bg-white/20"></div>

  <!-- 2D/3D pill toggle -->
  <div class="flex bg-white/15 rounded-full p-0.5">
    <button
      onclick={() => setMode('2d')}
      class="px-3 py-1 text-xs font-semibold rounded-full transition-colors {mode === '2d' ? 'bg-white text-green-700' : 'text-white/80 hover:text-white'}"
    >2D</button>
    <button
      onclick={() => setMode('3d')}
      class="px-3 py-1 text-xs font-semibold rounded-full transition-colors {mode === '3d' ? 'bg-white text-green-700' : 'text-white/80 hover:text-white'}"
    >3D</button>
  </div>

  <button onclick={save} class="px-3 py-1.5 text-sm bg-white text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors shadow-sm">
    Save
  </button>
</div>
