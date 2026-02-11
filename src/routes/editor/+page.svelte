<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { currentProject, viewMode, createDefaultProject } from '$lib/stores/project';
  import { localStore } from '$lib/services/datastore';
  import TopBar from '$lib/components/toolbar/TopBar.svelte';
  import BuildPanel from '$lib/components/sidebar/BuildPanel.svelte';
  import FloorPlanCanvas from '$lib/components/editor/FloorPlanCanvas.svelte';
  import ThreeViewer from '$lib/components/viewer3d/ThreeViewer.svelte';

  let mode = $state<'2d' | '3d'>('2d');
  let ready = $state(false);

  viewMode.subscribe((m) => { mode = m; });

  onMount(async () => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('id');
    if (id) {
      const project = await localStore.load(id);
      if (project) {
        currentProject.set(project);
        ready = true;
        return;
      }
    }
    // New project
    currentProject.set(createDefaultProject());
    ready = true;
  });
</script>

{#if ready}
  <div class="h-screen flex flex-col">
    <TopBar />
    <div class="flex flex-1 overflow-hidden">
      <BuildPanel />
      <div class="flex-1 relative">
        {#if mode === '2d'}
          <FloorPlanCanvas />
        {:else}
          <ThreeViewer />
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="h-screen flex items-center justify-center">
    <p class="text-gray-400">Loading...</p>
  </div>
{/if}
