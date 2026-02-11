import { writable, derived, get } from 'svelte/store';
import type { Project, Floor, Wall, Door, Window as Win, FurnitureItem, Point } from '$lib/models/types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createDefaultFloor(): Floor {
  const id = uid();
  return { id, name: 'Ground Floor', walls: [], rooms: [], doors: [], windows: [], furniture: [] };
}

export function createDefaultProject(name = 'Untitled Project'): Project {
  const floor = createDefaultFloor();
  return {
    id: uid(),
    name,
    floors: [floor],
    activeFloorId: floor.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export const currentProject = writable<Project | null>(null);

export const activeFloor = derived(currentProject, ($p) => {
  if (!$p) return null;
  return $p.floors.find((f) => f.id === $p.activeFloorId) ?? $p.floors[0] ?? null;
});

export type Tool = 'select' | 'wall' | 'door' | 'window' | 'furniture';
export const selectedTool = writable<Tool>('select');
export const selectedElementId = writable<string | null>(null);
export const viewMode = writable<'2d' | '3d'>('2d');

// Undo / Redo
const undoStack: string[] = [];
const redoStack: string[] = [];

function snapshot() {
  const p = get(currentProject);
  if (p) undoStack.push(JSON.stringify(p));
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
}

export function undo() {
  const prev = undoStack.pop();
  if (!prev) return;
  const cur = get(currentProject);
  if (cur) redoStack.push(JSON.stringify(cur));
  currentProject.set(JSON.parse(prev));
}

export function redo() {
  const next = redoStack.pop();
  if (!next) return;
  const cur = get(currentProject);
  if (cur) undoStack.push(JSON.stringify(cur));
  currentProject.set(JSON.parse(next));
}

function mutate(fn: (floor: Floor) => void) {
  const p = get(currentProject);
  if (!p) return;
  snapshot();
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor) return;
  fn(floor);
  p.updatedAt = new Date();
  currentProject.set({ ...p });
}

export function addWall(start: Point, end: Point): string {
  const id = uid();
  mutate((f) => {
    f.walls.push({ id, start, end, thickness: 15, height: 280, color: '#444444' });
  });
  return id;
}

export function removeWall(id: string) {
  mutate((f) => {
    f.walls = f.walls.filter((w) => w.id !== id);
    f.doors = f.doors.filter((d) => d.wallId !== id);
    f.windows = f.windows.filter((w) => w.wallId !== id);
  });
}

export function addDoor(wallId: string, position: number): string {
  const id = uid();
  mutate((f) => {
    f.doors.push({ id, wallId, position, width: 90, type: 'single', swingDirection: 'left' });
  });
  return id;
}

export function addWindow(wallId: string, position: number): string {
  const id = uid();
  mutate((f) => {
    f.windows.push({ id, wallId, position, width: 100, height: 120, sillHeight: 90 });
  });
  return id;
}

export function addFurniture(catalogId: string, position: Point): string {
  const id = uid();
  mutate((f) => {
    f.furniture.push({ id, catalogId, position, rotation: 0, scale: { x: 1, y: 1, z: 1 } });
  });
  return id;
}

export function removeElement(id: string) {
  mutate((f) => {
    f.walls = f.walls.filter((w) => w.id !== id);
    f.doors = f.doors.filter((d) => d.id !== id);
    f.windows = f.windows.filter((w) => w.id !== id);
    f.furniture = f.furniture.filter((fi) => fi.id !== id);
  });
}
