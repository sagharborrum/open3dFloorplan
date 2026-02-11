<script lang="ts">
  import { currentProject, viewMode, undo, redo } from '$lib/stores/project';
  import { localStore } from '$lib/services/datastore';
  import { get } from 'svelte/store';

  let projectName = $state('');
  let mode = $state<'2d' | '3d'>('2d');

  currentProject.subscribe((p) => { if (p) projectName = p.name; });
  viewMode.subscribe((m) => { mode = m; });

  function toggle3D() {
    viewMode.set(mode === '2d' ? '3d' : '2d');
  }

  async function save() {
    const p = get(currentProject);
    if (p) {
      await localStore.save(p);
      alert('Project saved!');
    }
  }
</script>

<div class="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
  <span class="font-semibold text-gray-800">{projectName}</span>

  <div class="flex-1"></div>

  <button onclick={undo} class="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded" title="Undo">↶ Undo</button>
  <button onclick={redo} class="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded" title="Redo">↷ Redo</button>

  <div class="h-6 w-px bg-gray-200"></div>

  <button
    onclick={toggle3D}
    class="px-3 py-1 text-sm rounded {mode === '3d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}"
  >{mode === '2d' ? '3D View' : '2D View'}</button>

  <button onclick={save} class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
    Save
  </button>
</div>
