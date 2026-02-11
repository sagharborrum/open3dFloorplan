<script lang="ts">
  import { onMount } from 'svelte';
  import { activeFloor, selectedTool, selectedElementId, selectedRoomId, addWall, addDoor, addWindow, removeElement } from '$lib/stores/project';
  import type { Point, Wall, Door, Window as Win } from '$lib/models/types';
  import type { Floor, Room } from '$lib/models/types';
  import { detectRooms, getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
  import { getMaterial } from '$lib/utils/materials';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(800);
  let height = $state(600);

  // Camera
  let camX = $state(0);
  let camY = $state(0);
  let zoom = $state(1);

  // Wall drawing state — continuous mode
  let wallStart: Point | null = $state(null);
  let mousePos: Point = $state({ x: 0, y: 0 });

  // Pan state
  let isPanning = $state(false);
  let panStartX = 0;
  let panStartY = 0;
  let spaceDown = $state(false);

  // Detected rooms (cached)
  let detectedRooms: Room[] = $state([]);
  let lastWallHash = '';

  const GRID = 20;
  const SNAP = 10;
  const MAGNETIC_SNAP = 15;

  function snap(v: number): number {
    return Math.round(v / SNAP) * SNAP;
  }

  function screenToWorld(sx: number, sy: number): Point {
    return { x: (sx - width / 2) / zoom + camX, y: (sy - height / 2) / zoom + camY };
  }

  function worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - camX) * zoom + width / 2, y: (wy - camY) * zoom + height / 2 };
  }

  /** Snap to existing wall endpoints if within MAGNETIC_SNAP pixels */
  function magneticSnap(p: Point): Point {
    if (!currentFloor) return { x: snap(p.x), y: snap(p.y) };
    let best = { x: snap(p.x), y: snap(p.y) };
    let bestDist = MAGNETIC_SNAP / zoom;
    for (const w of currentFloor.walls) {
      for (const ep of [w.start, w.end]) {
        const d = Math.hypot(p.x - ep.x, p.y - ep.y);
        if (d < bestDist) {
          bestDist = d;
          best = { x: ep.x, y: ep.y };
        }
      }
    }
    return best;
  }

  /** Snap angle to 0/45/90 increments if close */
  function angleSnap(start: Point, end: Point): Point {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len < 5) return end;
    const angle = Math.atan2(dy, dx);
    const snapAngles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
    const ANGLE_THRESHOLD = Math.PI / 18; // 10 degrees
    for (const sa of snapAngles) {
      if (Math.abs(angle - sa) < ANGLE_THRESHOLD) {
        return { x: start.x + len * Math.cos(sa), y: start.y + len * Math.sin(sa) };
      }
    }
    return end;
  }

  function resize() {
    const parent = canvas?.parentElement;
    if (!parent) return;
    width = parent.clientWidth;
    height = parent.clientHeight;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function drawGrid() {
    if (!ctx) return;
    const step = GRID * zoom;
    if (step < 4) return;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    const offX = (width / 2 - camX * zoom) % step;
    const offY = (height / 2 - camY * zoom) % step;
    for (let x = offX; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = offY; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }

  function wallLength(w: Wall): number {
    return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
  }

  /** Draw wall as thick rectangle */
  function drawWall(w: Wall, selected: boolean) {
    const s = worldToScreen(w.start.x, w.start.y);
    const e = worldToScreen(w.end.x, w.end.y);
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;

    const thickness = Math.max(w.thickness * zoom * 0.15, 3);
    const nx = (-dy / len) * thickness / 2;
    const ny = (dx / len) * thickness / 2;

    // Draw thick wall as filled polygon
    ctx.fillStyle = selected ? '#93c5fd' : '#6b7280';
    ctx.strokeStyle = selected ? '#3b82f6' : '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x + nx, s.y + ny);
    ctx.lineTo(e.x + nx, e.y + ny);
    ctx.lineTo(e.x - nx, e.y - ny);
    ctx.lineTo(s.x - nx, s.y - ny);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Endpoint circles
    ctx.fillStyle = selected ? '#3b82f6' : '#9ca3af';
    for (const p of [s, e]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(3, thickness / 2 + 1), 0, Math.PI * 2);
      ctx.fill();
    }

    // Dimension label
    const wlen = wallLength(w);
    const mx = (s.x + e.x) / 2;
    const my = (s.y + e.y) / 2;
    ctx.fillStyle = '#374151';
    ctx.font = `${Math.max(10, 11 * zoom)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(wlen)} cm`, mx, my - thickness / 2 - 4);
  }

  function drawDoorOnWall(wall: Wall, door: Door) {
    const t = door.position;
    const wx = wall.start.x + (wall.end.x - wall.start.x) * t;
    const wy = wall.start.y + (wall.end.y - wall.start.y) * t;
    const s = worldToScreen(wx, wy);
    const r = Math.max(door.width * 0.5 * zoom * 0.15, 6);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI);
    ctx.stroke();
    // Door line
    ctx.beginPath();
    ctx.moveTo(s.x - r, s.y);
    ctx.lineTo(s.x + r, s.y);
    ctx.stroke();
  }

  function drawWindowOnWall(wall: Wall, win: Win) {
    const t = win.position;
    const wx = wall.start.x + (wall.end.x - wall.start.x) * t;
    const wy = wall.start.y + (wall.end.y - wall.start.y) * t;
    const s = worldToScreen(wx, wy);
    const hw = Math.max(win.width * 0.5 * zoom * 0.15, 6);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x - hw, s.y);
    ctx.lineTo(s.x + hw, s.y);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - hw, s.y - 3);
    ctx.lineTo(s.x + hw, s.y - 3);
    ctx.moveTo(s.x - hw, s.y + 3);
    ctx.lineTo(s.x + hw, s.y + 3);
    ctx.stroke();
  }

  function drawRooms() {
    if (!currentFloor) return;
    for (const room of detectedRooms) {
      const poly = getRoomPolygon(room, currentFloor.walls);
      if (poly.length < 3) continue;

      const screenPoly = poly.map(p => worldToScreen(p.x, p.y));
      const mat = getMaterial(room.floorTexture);

      // Fill room
      ctx.fillStyle = mat.color + '40'; // semi-transparent
      ctx.beginPath();
      ctx.moveTo(screenPoly[0].x, screenPoly[0].y);
      for (let i = 1; i < screenPoly.length; i++) {
        ctx.lineTo(screenPoly[i].x, screenPoly[i].y);
      }
      ctx.closePath();
      ctx.fill();

      // Highlight selected room
      const isSelected = currentSelectedRoomId === room.id;
      if (isSelected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Room label
      const centroid = roomCentroid(poly);
      const sc = worldToScreen(centroid.x, centroid.y);
      ctx.fillStyle = '#374151';
      ctx.font = `bold ${Math.max(11, 13 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.name, sc.x, sc.y - 8 * zoom);
      ctx.font = `${Math.max(9, 11 * zoom)}px sans-serif`;
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${room.area} m²`, sc.x, sc.y + 10 * zoom);
    }
  }

  /** Draw angle guide lines when drawing walls */
  function drawAngleGuides(start: Point) {
    const s = worldToScreen(start.x, start.y);
    ctx.strokeStyle = '#3b82f640';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const guideLen = 200;
    const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
    for (const a of angles) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + guideLen * Math.cos(a), s.y + guideLen * Math.sin(a));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function updateDetectedRooms() {
    if (!currentFloor) return;
    const hash = JSON.stringify(currentFloor.walls.map(w => [w.start, w.end]));
    if (hash === lastWallHash) return;
    lastWallHash = hash;
    detectedRooms = detectRooms(currentFloor.walls);
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);
    drawGrid();

    const floor = currentFloor;
    if (!floor) { requestAnimationFrame(draw); return; }

    updateDetectedRooms();

    const selId = currentSelectedId;

    // Draw rooms first (below walls)
    drawRooms();

    // Draw walls
    for (const w of floor.walls) {
      drawWall(w, w.id === selId);
    }

    // Draw doors
    for (const d of floor.doors) {
      const wall = floor.walls.find((w) => w.id === d.wallId);
      if (wall) drawDoorOnWall(wall, d);
    }

    // Draw windows
    for (const win of floor.windows) {
      const wall = floor.walls.find((w) => w.id === win.wallId);
      if (wall) drawWindowOnWall(wall, win);
    }

    // Wall-in-progress with angle guides
    if (wallStart && $selectedTool === 'wall') {
      drawAngleGuides(wallStart);

      let endPt = magneticSnap(mousePos);
      endPt = angleSnap(wallStart, endPt);
      const s = worldToScreen(wallStart.x, wallStart.y);
      const e = worldToScreen(endPt.x, endPt.y);

      // Preview thick wall
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        const thickness = Math.max(15 * zoom * 0.15, 3);
        const nx = (-dy / len) * thickness / 2;
        const ny = (dx / len) * thickness / 2;
        ctx.fillStyle = '#3b82f620';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(s.x + nx, s.y + ny);
        ctx.lineTo(e.x + nx, e.y + ny);
        ctx.lineTo(e.x - nx, e.y - ny);
        ctx.lineTo(s.x - nx, s.y - ny);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Length preview
      const plen = Math.hypot(endPt.x - wallStart.x, endPt.y - wallStart.y);
      ctx.fillStyle = '#3b82f6';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(plen)} cm`, (s.x + e.x) / 2, (s.y + e.y) / 2 - 14);

      // Angle display
      const angle = Math.atan2(endPt.y - wallStart.y, endPt.x - wallStart.x) * 180 / Math.PI;
      ctx.fillText(`${Math.round(angle)}°`, (s.x + e.x) / 2, (s.y + e.y) / 2 + 16);

      // Magnetic snap indicator
      const snapped = magneticSnap(mousePos);
      const sd = worldToScreen(snapped.x, snapped.y);
      if (Math.hypot(snapped.x - snap(mousePos.x), snapped.y - snap(mousePos.y)) > 1) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sd.x, sd.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    requestAnimationFrame(draw);
  }

  // Subscribe to stores
  let currentFloor: Floor | null = $state(null);
  let currentSelectedId: string | null = $state(null);
  let currentSelectedRoomId: string | null = $state(null);

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    resize();
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(canvas.parentElement!);
    requestAnimationFrame(draw);

    const unsub1 = activeFloor.subscribe((f) => { currentFloor = f; });
    const unsub2 = selectedElementId.subscribe((id) => { currentSelectedId = id; });
    const unsub3 = selectedRoomId.subscribe((id) => { currentSelectedRoomId = id; });

    return () => { resizeObs.disconnect(); unsub1(); unsub2(); unsub3(); };
  });

  function findWallAt(p: Point): Wall | null {
    if (!currentFloor) return null;
    for (const w of currentFloor.walls) {
      const dist = pointToSegmentDist(p, w.start, w.end);
      if (dist < 15 / zoom) return w;
    }
    return null;
  }

  function findRoomAt(p: Point): Room | null {
    if (!currentFloor) return null;
    for (const room of detectedRooms) {
      const poly = getRoomPolygon(room, currentFloor.walls);
      if (pointInPolygon(p, poly)) return room;
    }
    return null;
  }

  function pointInPolygon(p: Point, poly: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if ((poly[i].y > p.y) !== (poly[j].y > p.y) &&
          p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) {
        inside = !inside;
      }
    }
    return inside;
  }

  function pointToSegmentDist(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function positionOnWall(p: Point, w: Wall): number {
    const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return 0.5;
    return Math.max(0.1, Math.min(0.9, ((p.x - w.start.x) * dx + (p.y - w.start.y) * dy) / len2));
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      return;
    }
    if (e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const tool = $selectedTool;

    if (tool === 'wall') {
      let endPt = magneticSnap(wp);
      if (wallStart) {
        endPt = angleSnap(wallStart, endPt);
      }
      if (!wallStart) {
        wallStart = endPt;
      } else {
        if (Math.hypot(endPt.x - wallStart.x, endPt.y - wallStart.y) > 5) {
          addWall(wallStart, endPt);
          // Continuous mode: start next wall from end of previous
          wallStart = endPt;
        }
      }
    } else if (tool === 'select') {
      const wall = findWallAt(wp);
      if (wall) {
        selectedElementId.set(wall.id);
        selectedRoomId.set(null);
      } else {
        const room = findRoomAt(wp);
        if (room) {
          selectedRoomId.set(room.id);
          selectedElementId.set(null);
        } else {
          selectedElementId.set(null);
          selectedRoomId.set(null);
        }
      }
    } else if (tool === 'door') {
      const wall = findWallAt(wp);
      if (wall) {
        const pos = positionOnWall(wp, wall);
        addDoor(wall.id, pos);
        selectedTool.set('select');
      }
    } else if (tool === 'window') {
      const wall = findWallAt(wp);
      if (wall) {
        const pos = positionOnWall(wp, wall);
        addWindow(wall.id, pos);
        selectedTool.set('select');
      }
    }
  }

  function onDblClick(e: MouseEvent) {
    // Double-click finishes wall chain
    if ($selectedTool === 'wall' && wallStart) {
      wallStart = null;
    }
  }

  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mousePos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (isPanning) {
      camX -= (e.clientX - panStartX) / zoom;
      camY -= (e.clientY - panStartY) / zoom;
      panStartX = e.clientX;
      panStartY = e.clientY;
    }
  }

  function onMouseUp() {
    isPanning = false;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom = Math.max(0.1, Math.min(10, zoom * factor));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') { spaceDown = true; e.preventDefault(); }
    if (e.code === 'Escape') { wallStart = null; selectedTool.set('select'); }
    if (e.code === 'Delete' || e.code === 'Backspace') {
      if (currentSelectedId) { removeElement(currentSelectedId); selectedElementId.set(null); }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') spaceDown = false;
  }
</script>

<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} />

<div class="w-full h-full relative overflow-hidden" role="application">
  <canvas
    bind:this={canvas}
    class="block w-full h-full cursor-crosshair"
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    ondblclick={onDblClick}
    onwheel={onWheel}
    oncontextmenu={(e) => e.preventDefault()}
  ></canvas>
  <div class="absolute bottom-2 right-2 bg-white/80 rounded px-2 py-1 text-xs text-gray-500">
    Zoom: {Math.round(zoom * 100)}%
  </div>
  {#if $selectedTool === 'wall' && wallStart}
    <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs shadow">
      Click to add wall segment · Double-click to finish · Esc to cancel
    </div>
  {/if}
</div>
