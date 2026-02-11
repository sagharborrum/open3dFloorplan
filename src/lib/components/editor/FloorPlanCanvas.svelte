<script lang="ts">
  import { onMount } from 'svelte';
  import { activeFloor, selectedTool, selectedElementId, addWall, addDoor, addWindow, removeElement } from '$lib/stores/project';
  import type { Point, Wall, Door, Window as Win } from '$lib/models/types';
  import type { Floor } from '$lib/models/types';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(800);
  let height = $state(600);

  // Camera
  let camX = $state(0);
  let camY = $state(0);
  let zoom = $state(1);

  // Wall drawing state
  let wallStart: Point | null = $state(null);
  let mousePos: Point = $state({ x: 0, y: 0 });

  // Pan state
  let isPanning = $state(false);
  let panStartX = 0;
  let panStartY = 0;
  let spaceDown = $state(false);

  const GRID = 20;
  const SNAP = 10;

  function snap(v: number): number {
    return Math.round(v / SNAP) * SNAP;
  }

  function screenToWorld(sx: number, sy: number): Point {
    return { x: (sx - width / 2) / zoom + camX, y: (sy - height / 2) / zoom + camY };
  }

  function worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - camX) * zoom + width / 2, y: (wy - camY) * zoom + height / 2 };
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

  function drawWall(w: Wall, selected: boolean) {
    const s = worldToScreen(w.start.x, w.start.y);
    const e = worldToScreen(w.end.x, w.end.y);
    ctx.strokeStyle = selected ? '#3b82f6' : w.color;
    ctx.lineWidth = Math.max(w.thickness * zoom * 0.15, 2);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();

    // Dimension label
    const len = wallLength(w);
    const mx = (s.x + e.x) / 2;
    const my = (s.y + e.y) / 2;
    ctx.fillStyle = '#374151';
    ctx.font = `${Math.max(10, 12 * zoom)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(len)} cm`, mx, my - 8 * zoom);
  }

  function drawDoorOnWall(wall: Wall, door: Door) {
    const t = door.position;
    const wx = wall.start.x + (wall.end.x - wall.start.x) * t;
    const wy = wall.start.y + (wall.end.y - wall.start.y) * t;
    const s = worldToScreen(wx, wy);
    const r = door.width * 0.5 * zoom * 0.15;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, Math.max(r, 4), 0, Math.PI);
    ctx.stroke();
  }

  function drawWindowOnWall(wall: Wall, win: Win) {
    const t = win.position;
    const wx = wall.start.x + (wall.end.x - wall.start.x) * t;
    const wy = wall.start.y + (wall.end.y - wall.start.y) * t;
    const s = worldToScreen(wx, wy);
    const hw = win.width * 0.5 * zoom * 0.15;
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x - Math.max(hw, 5), s.y);
    ctx.lineTo(s.x + Math.max(hw, 5), s.y);
    ctx.stroke();
    // parallel lines
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - Math.max(hw, 5), s.y - 3);
    ctx.lineTo(s.x + Math.max(hw, 5), s.y - 3);
    ctx.stroke();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);
    drawGrid();

    const floor = currentFloor;
    if (!floor) return;

    const selId = currentSelectedId;

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

    // Draw wall-in-progress
    if (wallStart && $selectedTool === 'wall') {
      const s = worldToScreen(wallStart.x, wallStart.y);
      const e = worldToScreen(snap(mousePos.x), snap(mousePos.y));
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      ctx.setLineDash([]);
      // length preview
      const len = Math.hypot(snap(mousePos.x) - wallStart.x, snap(mousePos.y) - wallStart.y);
      ctx.fillStyle = '#3b82f6';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(len)} cm`, (s.x + e.x) / 2, (s.y + e.y) / 2 - 12);
    }

    requestAnimationFrame(draw);
  }

  // Subscribe to stores
  let currentFloor: Floor | null = $state(null);
  let currentSelectedId: string | null = $state(null);

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    resize();
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(canvas.parentElement!);
    requestAnimationFrame(draw);

    const unsub1 = activeFloor.subscribe((f) => { currentFloor = f; });
    const unsub2 = selectedElementId.subscribe((id) => { currentSelectedId = id; });

    return () => { resizeObs.disconnect(); unsub1(); unsub2(); };
  });

  function findWallAt(p: Point): Wall | null {
    if (!currentFloor) return null;
    for (const w of currentFloor.walls) {
      const dist = pointToSegmentDist(p, w.start, w.end);
      if (dist < 15 / zoom) return w;
    }
    return null;
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
      if (!wallStart) {
        wallStart = { x: snap(wp.x), y: snap(wp.y) };
      } else {
        const end = { x: snap(wp.x), y: snap(wp.y) };
        if (Math.hypot(end.x - wallStart.x, end.y - wallStart.y) > 5) {
          addWall(wallStart, end);
        }
        wallStart = null;
      }
    } else if (tool === 'select') {
      const wall = findWallAt(wp);
      selectedElementId.set(wall ? wall.id : null);
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
    onwheel={onWheel}
    oncontextmenu={(e) => e.preventDefault()}
  ></canvas>
  <div class="absolute bottom-2 right-2 bg-white/80 rounded px-2 py-1 text-xs text-gray-500">
    Zoom: {Math.round(zoom * 100)}%
  </div>
</div>
