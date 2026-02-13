<script>
  import '../app.css';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  onMount(() => { import('$lib/firebase'); });
  let { children } = $props();
</script>

{@render children()}
