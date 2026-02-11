<script lang="ts">
  import { activeFloor, selectedElementId, selectedRoomId, updateWall, updateDoor, updateWindow, updateRoom } from '$lib/stores/project';
  import { floorMaterials, wallColors } from '$lib/utils/materials';
  import type { Floor, Wall, Door, Window as Win, Room } from '$lib/models/types';

  let floor: Floor | null = $state(null);
  let selId: string | null = $state(null);
  let selRoomId: string | null = $state(null);

  activeFloor.subscribe((f) => { floor = f; });
  selectedElementId.subscribe((id) => { selId = id; });
  selectedRoomId.subscribe((id) => { selRoomId = id; });

  let selectedWall = $derived(floor?.walls.find(w => w.id === selId) ?? null);
  let selectedDoor = $derived(floor?.doors.find(d => d.id === selId) ?? null);
  let selectedWindow = $derived(floor?.windows.find(w => w.id === selId) ?? null);
  let selectedRoom = $derived(floor?.rooms.find(r => r.id === selRoomId) ?? null);

  let wallLength = $derived(selectedWall ? Math.round(Math.hypot(selectedWall.end.x - selectedWall.start.x, selectedWall.end.y - selectedWall.start.y)) : 0);

  function onWallThickness(e: Event) {
    if (!selectedWall) return;
    updateWall(selectedWall.id, { thickness: Number((e.target as HTMLInputElement).value) });
  }
  function onWallHeight(e: Event) {
    if (!selectedWall) return;
    updateWall(selectedWall.id, { height: Number((e.target as HTMLInputElement).value) });
  }
  function onWallColor(e: Event) {
    if (!selectedWall) return;
    updateWall(selectedWall.id, { color: (e.target as HTMLInputElement).value });
  }
  function onDoorWidth(e: Event) {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { width: Number((e.target as HTMLInputElement).value) });
  }
  function onDoorType(e: Event) {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { type: (e.target as HTMLSelectElement).value as 'single' | 'double' });
  }
  function onDoorSwing(e: Event) {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { swingDirection: (e.target as HTMLSelectElement).value as 'left' | 'right' });
  }
  function onWindowWidth(e: Event) {
    if (!selectedWindow) return;
    updateWindow(selectedWindow.id, { width: Number((e.target as HTMLInputElement).value) });
  }
  function onWindowHeight(e: Event) {
    if (!selectedWindow) return;
    updateWindow(selectedWindow.id, { height: Number((e.target as HTMLInputElement).value) });
  }
  function onWindowSill(e: Event) {
    if (!selectedWindow) return;
    updateWindow(selectedWindow.id, { sillHeight: Number((e.target as HTMLInputElement).value) });
  }
  function onRoomName(e: Event) {
    if (!selectedRoom) return;
    updateRoom(selectedRoom.id, { name: (e.target as HTMLInputElement).value });
  }
  function onRoomFloor(texture: string) {
    if (!selectedRoom) return;
    updateRoom(selectedRoom.id, { floorTexture: texture });
  }

  let hasSelection = $derived(!!selectedWall || !!selectedDoor || !!selectedWindow || !!selectedRoom);
</script>

{#if hasSelection}
<div class="w-64 bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto p-3">
  {#if selectedWall}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">▭</span>
      Wall Properties
    </h3>
    <div class="space-y-3">
      <div>
        <label class="text-xs text-gray-500">Length (cm)</label>
        <input type="number" value={wallLength} disabled class="w-full px-2 py-1 border border-gray-200 rounded text-sm bg-gray-50" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Thickness (cm)</label>
        <input type="number" value={selectedWall.thickness} oninput={onWallThickness} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Height (cm)</label>
        <input type="number" value={selectedWall.height} oninput={onWallHeight} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Color</label>
        <div class="flex gap-1 flex-wrap mt-1">
          {#each wallColors as wc}
            <button
              class="w-6 h-6 rounded border-2 {selectedWall.color === wc.color ? 'border-blue-500' : 'border-gray-200'}"
              style="background-color: {wc.color}"
              title={wc.name}
              onclick={() => { if (selectedWall) updateWall(selectedWall.id, { color: wc.color }); }}
            ></button>
          {/each}
          <input type="color" value={selectedWall.color} oninput={onWallColor} class="w-6 h-6 p-0 border-0 cursor-pointer" />
        </div>
      </div>
    </div>

  {:else if selectedDoor}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-amber-100 rounded flex items-center justify-center text-xs">🚪</span>
      Door Properties
    </h3>
    <div class="space-y-3">
      <div>
        <label class="text-xs text-gray-500">Width (cm)</label>
        <input type="number" value={selectedDoor.width} oninput={onDoorWidth} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Type</label>
        <select value={selectedDoor.type} onchange={onDoorType} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="single">Single</option>
          <option value="double">Double</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500">Swing Direction</label>
        <select value={selectedDoor.swingDirection} onchange={onDoorSwing} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>

  {:else if selectedWindow}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-cyan-100 rounded flex items-center justify-center text-xs">🪟</span>
      Window Properties
    </h3>
    <div class="space-y-3">
      <div>
        <label class="text-xs text-gray-500">Width (cm)</label>
        <input type="number" value={selectedWindow.width} oninput={onWindowWidth} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Height (cm)</label>
        <input type="number" value={selectedWindow.height} oninput={onWindowHeight} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Sill Height (cm)</label>
        <input type="number" value={selectedWindow.sillHeight} oninput={onWindowSill} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </div>
    </div>

  {:else if selectedRoom}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-xs">⬜</span>
      Room Properties
    </h3>
    <div class="space-y-3">
      <div>
        <label class="text-xs text-gray-500">Room Name</label>
        <input type="text" value={selectedRoom.name} oninput={onRoomName} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </div>
      <div>
        <label class="text-xs text-gray-500">Area</label>
        <p class="text-sm text-gray-700">{selectedRoom.area} m²</p>
      </div>
      <div>
        <label class="text-xs text-gray-500">Floor Material</label>
        <div class="grid grid-cols-3 gap-1 mt-1">
          {#each floorMaterials as mat}
            <button
              class="p-1 rounded border-2 text-xs {selectedRoom.floorTexture === mat.id ? 'border-blue-500' : 'border-gray-200'}"
              onclick={() => onRoomFloor(mat.id)}
            >
              <div class="w-full h-6 rounded mb-1" style="background-color: {mat.color}"></div>
              {mat.name}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
{/if}
